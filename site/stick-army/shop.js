// Stick Army field supplies: the item list, the shop between waves, the kit display and the pizza courier.
// Classic script; load before game.js. game.js calls StickArmyShop(world) once with the world object it gives
// units.js and squad.js, and keeps aliases (ITEMS, openShop, takeItem and so on) for harnesses and tune.js.
var StickArmyShop = function (w) {
  'use strict';
  var GROUND = w.GROUND, W = w.W, INK = w.INK, RED = w.RED, BLUE = w.BLUE, PAPER = w.PAPER;
  var L = w.L, SP = w.SP, Ci = w.Ci, ink = w.ink, pen = w.pen, stick = w.stick;
  var shopScreen = document.getElementById('shopScreen'), pauseBtn = document.getElementById('pauseBtn');

  // ---------- field supplies: all upgrades are run-local ----------
  var ITEMS = [
    { id: 'fire', name: 'Quick trigger', desc: 'Fire 18% faster. Stacks four times.', tier: 'supply', cost: 25, maxStacks: 4, apply: function (s) { s.mods.fire++; } },
    { id: 'cool', name: 'Cooling fins', desc: 'Each shot heats the gun 20% less. Stacks three times.', tier: 'supply', cost: 20, maxStacks: 3, apply: function (s) { s.mods.cool++; } },
    { id: 'slot', name: 'Room for one more', desc: '+1 squad slot, up to eight.', tier: 'supply', cost: 30, maxStacks: 4, apply: function (s) { s.mods.slots++; } },
    { id: 'repair', name: 'Patch the wall', desc: 'Restore 30 wall health.', tier: 'supply', cost: 15, maxStacks: Infinity, apply: function () { w.repairWall(30, 'supply'); } },
    { id: 'mat', name: 'Bigger bounce', desc: 'Widen both trampoline frames by 12. Timing still matters!', tier: 'supply', cost: 20, maxStacks: 2, apply: function (s) { s.mods.mat++; w.resizeMats(); } },
    { id: 'aim', name: 'Steady hands', desc: 'Recruit spread is 28% tighter.', tier: 'supply', cost: 15, maxStacks: 3, apply: function (s) { s.mods.aim++; } },
    { id: 'sandbags', name: 'Sandbags', desc: '+25 maximum wall health, filled immediately.', tier: 'supply', cost: 20, maxStacks: 4, apply: function (s) { s.mods.maxHP += 25; w.repairWall(25, 'supply'); } },
    { id: 'wire', name: 'Barbed wire', desc: 'Marching enemies walk half as fast.', tier: 'supply', cost: 25, maxStacks: 1, apply: function (s) { s.mods.wire = true; } },
    { id: 'double', name: 'Double barrel', desc: 'Two parallel shots with each trigger pull.', tier: 'supply', cost: 40, maxStacks: 1, apply: function (s) { s.mods.double = true; } },
    { id: 'trench', name: 'Dig in', desc: 'Your crew take 40% less damage. A second trench makes it 60%.', tier: 'supply', cost: 25, maxStacks: 2, apply: function (s) { s.mods.trench++; } },
    { id: 'helmet', name: 'Helmets', desc: '+1 health for every recruit, now and later. Stacks three times.', tier: 'supply', cost: 20, maxStacks: 3, apply: function (s) { s.mods.helmet++; s.recruits.forEach(function (r) { if (!r.dead) r.hp += 1; }); } },
    { id: 'tramp', name: 'Second trampoline', desc: 'Open the right-hand mat. Twice the places to catch.', tier: 'supply', cost: 45, maxStacks: 1, apply: function (s) { s.mods.secondTramp = true; } },
    { id: 'spread', name: 'Spread shot', desc: 'Add two angled shots to every volley.', tier: 'supply', cost: 65, maxStacks: 1, apply: function (s) { s.mods.spread = true; } },
    { id: 'flak', name: 'Flak rounds', desc: 'Rounds burst near planes and bombs. Paratroopers are left to you.', tier: 'supply', cost: 80, maxStacks: 1, apply: function (s) { s.mods.flak = true; } },
    { id: 'rockets', name: 'Rocket rack', desc: 'Launch a bonus explosive rocket every fourth volley.', tier: 'supply', cost: 95, maxStacks: 1, apply: function (s) { s.mods.rockets = true; } },
    { id: 'pierce', name: 'Piercing rounds', desc: 'Each bullet passes through up to three targets.', tier: 'supply', cost: 70, maxStacks: 1, apply: function (s) { s.mods.pierce = true; } },
    { id: 'mines', name: 'Minefield', desc: 'Plant four mines every wave. Blasts spare your crew.', tier: 'supply', cost: 45, maxStacks: 1, apply: function (s) { s.mods.mines = true; } },
    { id: 'auto', name: 'Sentry tower', desc: 'A tower beside the bunker shoots down bombs and shells, then low chutes and landers.', tier: 'supply', cost: 100, maxStacks: 1, apply: function (s) { s.mods.auto = true; } },
    { id: 'hospital', name: 'Field hospital', desc: 'A tent with one bed. When a wave ends, your most decorated wounded soldier is carried in and back after a wave.', tier: 'supply', cost: 60, maxStacks: 1, apply: function (s) { s.mods.hospital = true; } },
    { id: 'catcher', name: 'Catcher training', desc: 'Rifle recruits aim for low chutes over an open mat.', tier: 'supply', cost: 60, maxStacks: 1, apply: function (s) { s.mods.catcher = true; } },
    { id: 'strike', name: 'Air strike', desc: 'A bomber carpets the field and hits tanks hard. Press B or the bomber button.', tier: 'supply', cost: 45, maxStacks: Infinity,
      available: function () { return w.callsHeld() < w.RADIO.SLOTS; }, blocked: radioFull, apply: function (s) { s.calls.bomber++; } },
    { id: 'fighter', name: 'Fighter cover', desc: 'A fighter sweeps the sky once, gunning down planes and bombs. Press C or the fighter button.', tier: 'supply', cost: 50, maxStacks: Infinity,
      available: function () { return w.callsHeld() < w.RADIO.SLOTS; }, blocked: radioFull, apply: function (s) { s.calls.fighter++; } },
    { id: 'pizza', name: 'Order a pizza', desc: 'Delivered before the next wave: +25 wall health and +1 health per recruit.', tier: 'supply', cost: 25, maxStacks: Infinity, apply: function (s) { s.pizzaOrder = true; } }
  ];
  function radioFull() { return w.callsHeld() >= w.RADIO.SLOTS ? 'Radio full' : ''; }
  // Hiring: pick a role for a free squad slot. Every hire, of any role, raises the next price by 15.
  [['rifle', 'Rifleman', 35, 'Steady fire at whatever is closest.'],
   ['engineer', 'Engineer', 40, 'Repairs the wall twice as fast as anyone.'],
   ['bazooka', 'Bazooka', 55, 'Slow rockets for tanks and aircraft.'],
   ['sniper', 'Sniper', 50, 'Slow, precise shots.'],
   ['medic', 'Medic', 55, 'Heals nearby crew. One at a time.']].forEach(function (h) {
    ITEMS.push({ id: 'hire-' + h[0], role: h[0], name: h[1], desc: h[3], tier: 'hire', maxStacks: Infinity,
      cost: function () { return h[2] + 15 * w.S.mods.hired; },
      available: function () { return w.freeSlot(0) >= 0 && (h[0] !== 'medic' || !w.S.recruits.some(function (r) { return !r.dead && r.type === 'medic'; })); },
      apply: function (s) { s.mods.hired++; var r = w.makeRecruit(w.freeSlot(0), h[0]); r.fresh = true; s.recruits.push(r); } });
  });
  function price(item) { return typeof item.cost === 'function' ? item.cost() : item.cost; }
  function eligible(item) { return (w.S.mods.stacks[item.id] || 0) < item.maxStacks && (!item.available || item.available()); }
  // Offers walk a seeded shuffle of every supply and take the first eligible ones, so for a given seed
  // the offers change only when eligibility does.
  var OFFERS = 3;
  function offer(n, skip) {
    var order = ITEMS.filter(function (it) { return it.tier === 'supply' && skip.indexOf(it.id) < 0; }), i, j, tmp;
    for (i = order.length - 1; i > 0; i--) { j = Math.floor(w.RS() * (i + 1)); tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
    return order.filter(eligible).slice(0, n);
  }
  // One random offer each visit is on the house.
  function onHouse(it) { var S = w.S; return S.shop && it.id === S.shop.gift && !S.shop.giftTaken; }
  function costNow(it) { return onHouse(it) ? 0 : price(it); }
  function openShop() {
    var S = w.S;
    S.mode = 'shop'; S.waveState = 'shop'; w.clearInput(); S.bullets = []; S.banner = null; S.delivery = null; w.washDecals();
    // Three rotating supplies from one pool (one of them free), both radio calls from wave 3, pizza always,
    // and every role for hire.
    var items = offer(OFFERS, ['pizza', 'strike', 'fighter']), gift = Math.floor(w.RS() * Math.max(1, items.length));
    var always = ITEMS.filter(function (it) { return it.id === 'pizza' || (it.id === 'strike' && S.wave >= w.FIGHTER.SHOP_WAVE) || (it.id === 'fighter' && S.wave >= w.FIGHTER.SHOP_WAVE); });
    S.shop = { items: items.concat(always), hire: ITEMS.filter(function (it) { return it.tier === 'hire'; }),
      gift: items.length ? items[gift].id : null, giftTaken: false, bought: {} };
    w.emit('shop_offer', { wave: S.wave, items: S.shop.items.map(function (it) { return it.id; }), gift: S.shop.gift });
    shopScreen.hidden = false; pauseBtn.hidden = true; renderShop();
    // Every visit starts at the top of the list.
    shopScreen.scrollTop = 0; shopScreen.querySelector('.shop-stock').scrollTop = 0;
    w.sound.play('shop');
    shopScreen.querySelector('button:not(:disabled)').focus({ preventScroll: true });
  }
  function takeItem(id) {
    var S = w.S;
    if (S.mode !== 'shop' || !S.shop) return false;
    var item = S.shop.items.concat(S.shop.hire).find(function (it) { return it.id === id; });
    // Supplies sell once per visit; hiring repeats while slots and tags last.
    if (!item || (S.shop.bought[id] && item.tier !== 'hire') || !eligible(item)) return false;
    var gift = onHouse(item), cost = costNow(item);
    if (S.coins < cost) return false;
    S.coins -= cost; if (gift) S.shop.giftTaken = true;
    w.emit('purchase', { item: id, tier: item.tier, cost: cost, gift: gift });
    S.shop.bought[id] = true; S.mods.stacks[id] = (S.mods.stacks[id] || 0) + 1; item.apply(S);
    w.sound.play('recruit'); renderShop();
    if (S.mode === 'shop') (shopScreen.querySelector('.shop-stock button:not(:disabled)') || document.getElementById('continueBtn')).focus({ preventScroll: true });
    return true;
  }
  function renderShop() {
    var S = w.S;
    document.getElementById('shopWave').textContent = 'Wave ' + S.wave + ' survived';
    document.getElementById('shopCoins').textContent = S.coins + ' dog tags';
    var news = document.getElementById('shopNews'); news.textContent = S.news.join(' '); news.hidden = !S.news.length;
    document.getElementById('shopReport').textContent = (S.stats.kills - S.waveStart.kills) + ' down · ' + (S.stats.captured - S.waveStart.captured) + ' recruited · wall ' + Math.ceil(S.wallHP) + '/' + S.mods.maxHP;
    document.getElementById('shopHint').textContent = (S.shop.gift && !S.shop.giftTaken ? 'One supply is on the house. Spend dog tags on the rest, or save them.' : 'Spend dog tags on what you like, or save them.') +
      (w.waveCfg(S.wave + 1).boss ? ' Heads up: a zeppelin is coming.' : '');
    // Supplies are compact rows, one of them on the house; hiring is a grid of role chips.
    function canBuy(it) { return eligible(it) && (it.tier === 'hire' || !S.shop.bought[it.id]) && S.coins >= costNow(it); }
    function costLabel(it) {
      if (it.id === 'pizza' && S.pizzaOrder) return 'On its way ✓';
      if (it.blocked && it.blocked() && !S.shop.bought[it.id]) return it.blocked();
      if (it.tier !== 'hire' && S.shop.bought[it.id]) return 'Packed ✓';
      if (onHouse(it)) return 'Free!';
      return price(it) + ' tags';
    }
    // How many more tags an unaffordable supply needs. It sits on its own line under the price, so the row keeps
    // its width and doesn't jump when the balance changes.
    function needMore(it) {
      return it.tier !== 'hire' && !S.shop.bought[it.id] && !onHouse(it) && eligible(it) && S.coins < price(it) ? price(it) - S.coins : 0;
    }
    function itemButton(it, cls, withDesc) {
      var button = document.createElement('button'); button.type = 'button'; button.dataset.item = it.id;
      button.className = cls + (onHouse(it) ? ' gift' : '') + (it.tier !== 'hire' && S.shop.bought[it.id] ? ' bought' : '');
      button.disabled = !canBuy(it);
      var icon = document.createElement('canvas'); icon.className = 'supply-icon'; icon.width = icon.height = 132; icon.setAttribute('aria-hidden', 'true');
      w.drawItemIcon(icon, it.id);
      var name = document.createElement('strong'); name.textContent = it.name;
      var label = document.createElement('em'); label.textContent = it.tier === 'hire' ? String(price(it)) : costLabel(it);
      button.append(icon, name);
      if (withDesc) { var desc = document.createElement('span'); desc.textContent = it.desc; button.append(desc); }
      else button.title = it.desc;
      if (onHouse(it)) { var was = document.createElement('s'); was.textContent = price(it); label.prepend(was, ' '); }
      if (needMore(it)) { var more = document.createElement('small'); more.textContent = 'need ' + needMore(it) + ' more'; label.append(more); }
      button.append(label);
      button.addEventListener('click', function () { takeItem(it.id); });
      return button;
    }
    document.getElementById('supplyItems').replaceChildren.apply(document.getElementById('supplyItems'), S.shop.items.map(function (it) { return itemButton(it, 'deal', true); }));
    var roles = S.shop.hire.filter(function (it) { return it.role !== 'medic' || eligible(it) || w.freeSlot(0) < 0; });
    document.getElementById('hireItems').replaceChildren.apply(document.getElementById('hireItems'), roles.map(function (it) { return itemButton(it, 'hire', false); }));
    document.getElementById('hireNote').textContent = w.freeSlot(0) < 0 ? 'Squad full. Unlock a slot to hire.' : 'Price rises with each hire.';
    renderKit(document.getElementById('loadout'), false);
    document.getElementById('continueBtn').textContent = 'Wave ' + (S.wave + 1) + ' →';
  }
  function continueWave() {
    var S = w.S;
    if (S.mode !== 'shop') return;
    var bought = S.shop.bought;
    shopScreen.hidden = true; S.shop = null; w.clearInput(); S.mode = 'play'; pauseBtn.hidden = false;
    // A pizza ordered in the shop is its own little scene before the wave: the courier rides in, everyone is fed,
    // and the wave starts as he rides off (updateWave). Without one, the wave starts now.
    if (S.pizzaOrder) {
      S.pizzaOrder = false; S.waveState = 'pizza'; S.nextWave = { wave: S.wave + 1, bought: bought };
      S.delivery = { x: -30, phase: 'arrive', wait: 0 };
    } else { w.queueSketches(bought); w.startWave(S.wave + 1); }
    document.activeElement.blur();
  }
  // The courier rides along the ground before the wave; the pizza lands at the handoff in the middle of the page.
  function updateDelivery(dt) {
    var S = w.S;
    var d = S.delivery;
    if (!d) return;
    if (d.phase === 'arrive') {
      d.x = Math.min(200, d.x + dt * 145);
      if (d.x === 200) {
        d.phase = 'serve'; d.wait = 1.2; w.repairWall(25, 'pizza'); w.emit('pizza', { wave: S.nextWave ? S.nextWave.wave : S.wave });
        S.recruits.forEach(function (r) { if (!r.dead) { r.hp = Math.min(w.crewMax(r), r.hp + 1); if (r.down) w.standUp(r, 'pizza'); } });
        w.sound.play('pizza'); w.addText('pizza time!', 200, GROUND - 65, BLUE, 26);
      }
    } else if (d.phase === 'serve') { d.wait -= dt; if (d.wait <= 0) d.phase = 'leave'; }
    else {
      d.x += dt * 145;
      if (d.x > W + 35) S.delivery = null;
    }
  }
  function drawCourier() {
    var S = w.S, G = w.G, d = S.delivery;
    if (!d) return;
    var x = d.x, y = GROUND - 17; pen(8080);
    G.beginPath(); Ci(x - 13, y + 12, 8); Ci(x + 16, y + 12, 8); ink(INK, 2.3); G.stroke();
    G.beginPath(); SP([x - 13,y + 12,x - 5,y - 4,x + 9,y + 12,x - 13,y + 12],false); L(x - 5,y - 4,x + 11,y - 4); L(x + 11,y - 8,x + 16,y + 12); ink(BLUE,2.4); G.stroke();
    stick(x - 5, y - 30, [7,17,18,17,3,33,-5,29], INK, 2.3);
    G.beginPath(); L(x - 12,y - 34,x + 2,y - 34); ink(RED,4); G.stroke();
    var bx = d.phase === 'serve' ? x + 26 : x - 27, by = d.phase === 'serve' ? y - 28 : y - 9;
    if (d.phase !== 'leave') {
      G.fillStyle=PAPER; G.fillRect(bx-10,by-5,22,9); G.beginPath(); L(bx-10,by-5,bx+12,by-5,0.3); L(bx+12,by-5,bx+12,by+4,0.3); L(bx+12,by+4,bx-10,by+4,0.3); L(bx-10,by+4,bx-10,by-5,0.3); ink(RED,1.7); G.stroke();
      G.beginPath(); Ci(bx,by,2); ink(RED,1.2); G.stroke();
    }
  }

  // Owned upgrades as pencil icons: icon-only with counts in the shop, icon and name on the pause card.
  // Repeatable buys (repairs, pizza, hires) aren't kit.
  function kitItems() {
    var S = w.S;
    return ITEMS.filter(function (it) { return S.mods.stacks[it.id] && it.maxStacks !== Infinity; });
  }
  function renderKit(holder, named) {
    var S = w.S;
    var items = kitItems();
    holder.replaceChildren();
    if (!items.length) { var none = document.createElement('span'); none.className = 'kit-empty'; none.textContent = 'No kit yet. A fresh page.'; holder.append(none); }
    items.forEach(function (it) {
      var n = S.mods.stacks[it.id], chip = document.createElement('span'), icon = document.createElement('canvas'), text = document.createElement('span');
      chip.className = 'kit-item'; chip.title = it.name + (n > 1 ? ' ×' + n : '');
      icon.width = icon.height = 88; icon.setAttribute('aria-hidden', 'true'); w.drawItemIcon(icon, it.id);
      text.className = named ? 'kit-name' : 'sr'; text.textContent = it.name + (n > 1 ? ' ×' + n : '');
      chip.append(icon, text);
      if (!named && n > 1) { var count = document.createElement('b'); count.setAttribute('aria-hidden', 'true'); count.textContent = '×' + n; chip.append(count); }
      holder.append(chip);
    });
    return items.length;
  }

  return { ITEMS: ITEMS, price: price, eligible: eligible, OFFERS: OFFERS, offer: offer, onHouse: onHouse, costNow: costNow,
    openShop: openShop, takeItem: takeItem, renderShop: renderShop, continueWave: continueWave,
    updateDelivery: updateDelivery, drawCourier: drawCourier, kitItems: kitItems, renderKit: renderKit };
};
