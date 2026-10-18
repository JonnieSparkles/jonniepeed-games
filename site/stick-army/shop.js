// Stick Army field supplies: the item list, prices, what's offered, and buying, putting back and undo between waves.
// The bookkeeping only: the shop screen is shop-screen.js, which draws what this decides. Classic script; load
// before game.js. game.js calls StickArmyShop(world) once with the world object it gives units.js and squad.js, and
// keeps aliases (ITEMS, openShop, takeItem and so on) for harnesses and tune.js.
var StickArmyShop = function (w) {
  'use strict';

  // ---------- field supplies: all upgrades are run-local ----------
  var ITEMS = [
    { id: 'fire', name: 'Quick trigger', desc: 'Fire 18% faster. Stacks four times.', tier: 'supply', cost: 25, maxStacks: 4, apply: function (s) { s.mods.fire++; } },
    { id: 'cool', name: 'Cooling fins', desc: 'Each shot heats the gun 20% less. Stacks three times.', tier: 'supply', cost: 20, maxStacks: 3, apply: function (s) { s.mods.cool++; } },
    { id: 'slot', name: 'Room for one more', desc: '+1 squad slot, up to eight.', tier: 'supply', cost: 30, maxStacks: 4, apply: function (s) { s.mods.slots++; } },
    // Not offered while the wall is full; greyed if it fills up during the visit.
    { id: 'repair', name: 'Patch the wall', desc: 'Restore 30 wall health.', tier: 'supply', cost: 15, maxStacks: Infinity,
      available: function () { return w.S.wallHP < w.S.mods.maxHP; }, blocked: function () { return w.S.wallHP >= w.S.mods.maxHP ? 'Wall is full' : ''; },
      apply: function () { w.repairWall(30, 'supply'); } },
    { id: 'mat', name: 'Bigger bounce', desc: 'Widen both trampoline frames by 12. Timing still matters!', tier: 'supply', cost: 20, maxStacks: 2, apply: function (s) { s.mods.mat++; w.resizeMats(); } },
    { id: 'aim', name: 'Steady hands', desc: 'Recruit spread is 28% tighter.', tier: 'supply', cost: 15, maxStacks: 3, apply: function (s) { s.mods.aim++; } },
    { id: 'sandbags', name: 'Sandbags', desc: '+25 maximum wall health, filled immediately.', tier: 'supply', cost: 20, maxStacks: 4, apply: function (s) { s.mods.maxHP += 25; w.repairWall(25, 'supply'); } },
    { id: 'wire', name: 'Barbed wire', desc: 'Marching enemies walk half as fast.', tier: 'supply', cost: 25, maxStacks: 1, apply: function (s) { s.mods.wire = true; } },
    { id: 'double', name: 'Double barrel', desc: 'Two parallel shots with each trigger pull.', tier: 'supply', cost: 40, maxStacks: 1, apply: function (s) { s.mods.double = true; } },
    { id: 'trench', name: 'Dig in', desc: 'Your crew take 40% less damage. A second trench makes it 60%.', tier: 'supply', cost: 25, maxStacks: 2, apply: function (s) { s.mods.trench++; } },
    { id: 'helmet', name: 'Helmets', desc: '+1 health for every recruit, now and later. Stacks three times.', tier: 'supply', cost: 20, maxStacks: 3, apply: function (s) { s.mods.helmet++; s.recruits.forEach(function (r) { if (!r.dead) r.hp += 1; }); } },
    { id: 'tramp', name: 'Second trampoline', desc: 'Open a mat on the other side. Twice the places to catch.', tier: 'supply', cost: 45, maxStacks: 1, apply: function (s) { s.mods.secondTramp = true; } },
    { id: 'spread', name: 'Spread shot', desc: 'Add two angled shots to every volley.', tier: 'supply', cost: 65, maxStacks: 1, apply: function (s) { s.mods.spread = true; } },
    { id: 'flak', name: 'Flak rounds', desc: 'Rounds burst near planes and bombs. Paratroopers are left to you.', tier: 'supply', cost: 80, maxStacks: 1, apply: function (s) { s.mods.flak = true; } },
    { id: 'rockets', name: 'Rocket rack', desc: 'Launch a bonus explosive rocket every fourth volley.', tier: 'supply', cost: 95, maxStacks: 1, apply: function (s) { s.mods.rockets = true; } },
    { id: 'pierce', name: 'Piercing rounds', desc: 'Each bullet passes through up to three targets.', tier: 'supply', cost: 70, maxStacks: 1, apply: function (s) { s.mods.pierce = true; } },
    { id: 'mines', name: 'Minefield', desc: 'Plant four mines every wave. Blasts spare your crew.', tier: 'supply', cost: 45, maxStacks: 1, apply: function (s) { s.mods.mines = true; } },
    { id: 'auto', name: 'Sentry tower', desc: 'A tower beside the bunker shoots down bombs and shells, then low chutes and landers.', tier: 'supply', cost: 100, maxStacks: 1, apply: function (s) { s.mods.auto = true; } },
    { id: 'hospital', name: 'Field hospital', desc: 'A tent with one bed. When a wave ends, your most decorated wounded soldier is carried in and back after a wave.', tier: 'supply', cost: 60, maxStacks: 1, apply: function (s) { s.mods.hospital = true; } },
    // The flagpole: "It boosts morale." The squad fires FLAG.FIRE faster while it flies, and salutes it at every wave
    // start (game.js FLAG).
    { id: 'flag', name: 'Flagpole', desc: 'It boosts morale.', tier: 'supply', cost: 40, maxStacks: 1,
      available: function () { return w.S.wave >= w.FLAG.FROM; }, apply: function (s) { s.mods.flag = true; s.flagUp = 0; } },
    { id: 'catcher', name: 'Catcher training', desc: 'Rifle recruits aim for low chutes over an open mat.', tier: 'supply', cost: 60, maxStacks: 1, apply: function (s) { s.mods.catcher = true; } },
    { id: 'strike', name: 'Air strike', desc: 'A bomber carpets the field and hits tanks hard. Press B or the bomber button.', tier: 'supply', cost: 45, maxStacks: Infinity,
      available: function () { return w.callsHeld() < w.RADIO.SLOTS; }, blocked: radioFull, apply: function (s) { s.calls.bomber++; } },
    { id: 'fighter', name: 'Fighter cover', desc: 'A fighter sweeps the sky once, gunning down planes and bombs. Press C or the fighter button.', tier: 'supply', cost: 50, maxStacks: Infinity,
      available: function () { return w.callsHeld() < w.RADIO.SLOTS; }, blocked: radioFull, apply: function (s) { s.calls.fighter++; } },
    // Training (TRAIN): a stripe for everyone in the squad now, the one in the tent too, and every soldier who joins
    // after, hired or caught, starts with a stripe for each level bought (squad.js train). In the rotation like any
    // supply: Boot Camp from wave TRAIN.BOOT, Elite Training from TRAIN.ELITE once Boot Camp is done.
    { id: 'bootcamp', name: 'Boot Camp', desc: 'Everyone in your squad gets a stripe, and every new soldier starts with one.', tier: 'supply', cost: 60, maxStacks: 1,
      available: function () { return w.S.wave >= TRAIN.BOOT; }, apply: trainSquad },
    { id: 'elite', name: 'Elite Training', desc: 'Everyone in your squad gets another stripe, and new soldiers start with two.', tier: 'supply', cost: 150, maxStacks: 1,
      available: function () { return w.S.wave >= TRAIN.ELITE && (w.S.mods.training || 0) >= 1; }, apply: trainSquad },
    // Pizza is always on the menu, at the same price all war.
    { id: 'pizza', name: 'Order a pizza', desc: 'Delivered before the next wave: +25 wall health and +1 health per recruit.', tier: 'supply', cost: 25, maxStacks: Infinity, flat: true, apply: function (s) { s.pizzaOrder = true; } }
  ];
  function radioFull() { return w.callsHeld() >= w.RADIO.SLOTS ? 'Radio full' : ''; }
  var TRAIN = { BOOT: 5, ELITE: 10 };
  function trainSquad(s) {
    s.mods.training = (s.mods.training || 0) + 1;
    s.recruits.forEach(function (r) { if (!r.dead) w.SQUAD.train(r, 1); });
    if (s.bed) w.SQUAD.train(s.bed.r, 1);
  }
  function hasMedic() { return w.S.recruits.some(function (r) { return !r.dead && r.type === 'medic'; }); }
  // ---------- buyers ----------
  // Every purchase has a buyer, `by`: a player (0 the host, 1 the co-op guest; this device's player when left out).
  // Each player pays from their own dog tags (game.js tagsOf) and gets their own gift. Turret upgrades
  // (game.js TURRET_MODS) are the buyer's barrel's, with stacks counted per barrel; everything else is the squad's,
  // bought once by anyone. Only the buyer puts a thing back, and gets the tags back. Solo is the one-player case;
  // the rules that differ in co-op (squad prices, the screen's labels) check w.S.coop.
  var TURRET = {};
  w.TURRET_MODS.forEach(function (id) { TURRET[id] = true; });
  function coop() { return !!w.S.coop; }
  function own(it) { return !!TURRET[it.id]; }
  function buyer(by) { return by == null ? w.me : by; }
  function stacksOf(it, by) { return own(it) ? w.S.turrets[buyer(by)].mods.stacks : w.S.mods.stacks; }
  // What a purchase is filed under in the visit: a turret upgrade per buyer ('spread@1'), anything else by its id.
  function slot(it, by) { return own(it) ? it.id + '@' + buyer(by) : it.id; }
  // The visit's log lists every purchase in order as 'id@buyer'.
  function entry(id, by) { return id + '@' + buyer(by); }
  function parse(e) { var at = e.lastIndexOf('@'); return { id: e.slice(0, at), by: Number(e.slice(at + 1)) }; }
  function bought(it, by) { var S = w.S; return !!(S.shop && S.shop.bought[slot(it, by)]); }
  // A squad supply someone else bought: shown as theirs, and only they can put it back.
  function othersBuy(it, by) { var S = w.S; return it.tier !== 'hire' && bought(it, by) && S.shop.who[slot(it, by)] !== buyer(by); }
  // A guest's taps go to the host (coop.js); true when they did.
  function remote(action, id) { return !!(w.coopRemote && w.coopRemote(action, id)); }
  // War prices: supplies run short as the war drags on. After wave WAR.FROM, prices rise WAR.SUPPLY a wave (about three
  // times by wave 19) and soldiers WAR.HIRE a wave (about four times), which makes a recruit caught on the mat worth
  // more as the run goes on. The early waves keep their prices. Prices round to fives; pizza and the gift are exempt.
  var WAR = { FROM: 6, SUPPLY: 0.15, HIRE: 0.22 };
  // Veteran's markup (game.js LEVELS): nothing on wave 1, climbing to PRICE times everything but the pizza by wave
  // FROM, where stacking starts to tell; war prices on top. The pizza stays flat ("sometimes u just want pizza").
  function markup() { var L = w.lv(); return L.PRICE === 1 ? 1 : 1 + (L.PRICE - 1) * Math.min(1, Math.max(0, ((w.S.wave || 1) - 1) / (L.FROM - 1))); }
  function war(rate) { return markup() * (1 + rate * Math.max(0, (w.S.wave || 1) - WAR.FROM)); }
  function fives(n) { return Math.max(5, Math.round(n / 5) * 5); }
  // Hiring: pick a role for a free squad slot. Every hire, of any role, raises the next price by 15 (before war prices).
  [['rifle', 'Rifleman', 35, 'Steady fire at whatever is closest.'],
   ['engineer', 'Engineer', 40, 'Repairs the wall twice as fast as anyone.'],
   ['bazooka', 'Bazooka', 55, 'Slow rockets for tanks and aircraft.'],
   ['sniper', 'Sniper', 50, 'Slow, precise shots.'],
   ['medic', 'Medic', 55, 'Heals nearby crew. One at a time.']].forEach(function (h) {
    ITEMS.push({ id: 'hire-' + h[0], role: h[0], name: h[1], desc: h[3], tier: 'hire', maxStacks: Infinity,
      cost: function () { return fives((h[2] + 15 * w.S.mods.hired) * war(WAR.HIRE)); },
      // One medic at a time: with one in the squad he's greyed, marked "Have one", rather than dropped from the list.
      available: function () { return w.freeSlot(0) >= 0 && (h[0] !== 'medic' || !hasMedic()); },
      blocked: h[0] === 'medic' ? function () { return hasMedic() ? 'Have one' : ''; } : null,
      apply: function (s) { s.mods.hired++; var r = w.makeRecruit(w.freeSlot(0), h[0]); r.fresh = true; s.recruits.push(r); } });
  });
  function price(item) {
    if (item.flat) return item.cost;
    var n = typeof item.cost === 'function' ? item.cost() : fives(item.cost * war(WAR.SUPPLY));
    // Co-op: two wallets fund one squad, so its things cost more (game.js COOP_HARD.SQUAD_PRICE); your gun's don't.
    return coop() && !own(item) ? fives(n * w.COOP_HARD.SQUAD_PRICE) : n;
  }
  // The kit: every lasting supply (not the pizza, patches, radio calls or hires), each stack one piece. Veteran's holds
  // KIT pieces (game.js LEVELS; round 19, "I think it is that stuff stacks"): once it's full, what's left on offer is
  // greyed "Kit full", so buying is building. In co-op a player's kit is the team's supplies and their own barrel's.
  function isKit(it) { return it.tier === 'supply' && it.maxStacks !== Infinity; }
  function kitCount(by) {
    return ITEMS.reduce(function (n, it) { return n + (isKit(it) ? stacksOf(it, by)[it.id] || 0 : 0); }, 0);
  }
  function kitFull(it, by) { return isKit(it) && kitCount(by) >= w.lv().KIT; }
  function canStack(item, by) { return (stacksOf(item, by)[item.id] || 0) < item.maxStacks && (!item.available || item.available()); }
  function eligible(item, by) { return canStack(item, by) && !kitFull(item, by); }
  // On offer if any barrel can still take it (a turret upgrade), or the squad can. A full kit doesn't take it off the
  // table: it shows, greyed.
  function offerable(item) { return own(item) ? w.S.turrets.some(function (t, i) { return canStack(item, i); }) : canStack(item); }
  // Offers walk a seeded shuffle of every supply and take the first eligible ones, so for a given seed
  // the offers change only when eligibility does.
  var OFFERS = 3;
  function offer(n, skip) {
    var order = ITEMS.filter(function (it) { return it.tier === 'supply' && skip.indexOf(it.id) < 0; }), i, j, tmp;
    for (i = order.length - 1; i > 0; i--) { j = Math.floor(w.RS() * (i + 1)); tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
    return order.filter(offerable).slice(0, n);
  }
  // The gift: each player gets one of the visit's rotating supplies on the house (S.shop.gifts, by player), until they
  // take it (S.shop.giftTaken).
  function onHouse(it, by) {
    var S = w.S;
    if (!S.shop || S.shop.giftTaken[buyer(by)]) return false;
    return it.id === S.shop.gifts[buyer(by)];
  }
  // Each player's gift, drawn in turn: a random one of the rotating supplies, not one an earlier player got if there's
  // another, and moved to something they can take if their kit (or barrel) can't take it.
  function drawGifts(items) {
    var gifts = [], all = items.map(function (it, k) { return k; });
    w.S.players.forEach(function (p, i) {
      var fresh = all.filter(function (k) { return gifts.indexOf(items[k].id) < 0; }), pool = fresh.length ? fresh : all;
      var g = pool[Math.floor(w.RS() * Math.max(1, pool.length))];
      if (!items.length) { gifts.push(null); return; }
      if (!eligible(items[g], i)) { var open = pool.concat(all).find(function (k) { return eligible(items[k], i); }); if (open != null) g = open; }
      gifts.push(items[g].id);
    });
    return gifts;
  }
  function costNow(it, by) { return onHouse(it, by) ? 0 : price(it); }

  // ---------- sending a soldier home ----------
  // One soldier a visit can leave the squad from the shop, to free their slot (round 20: "be able to RELEASE a squad
  // member from duty"). It costs half a rifleman's hire as it stands (war prices, co-op and all), so it never pays:
  // the open slot is the point. It goes in the visit's log as 'send:<recruit id>', so putting it back, undo and a
  // hire into the freed slot all follow the rules everything else does (a hire into that slot goes back with them).
  // The hire price doesn't drop. Named soldiers sent home are listed on the end cards (S.sentHome).
  var SEND = 'send:';
  function isSend(id) { return id.indexOf(SEND) === 0; }
  function sendCost() { return fives(price(ITEMS.find(function (it) { return it.id === 'hire-rifle'; })) / 2); }
  function member(rid) {
    var S = w.S, r = S.recruits.find(function (q) { return !q.dead && String(q.id) === rid; });
    return r || (S.bed && String(S.bed.r.id) === rid ? S.bed.r : null);
  }
  // Who was sent home this visit (their log entry, parsed), or null.
  function sentNow() {
    var S = w.S;
    if (!S.shop) return null;
    var e = S.shop.log.map(parse).find(function (q) { return isSend(q.id); });
    return e || null;
  }
  // Not someone hired this visit (r.fresh): put the hire back instead, for the full price.
  function canSend(r, by) { return !!r && !r.fresh && !sentNow() && w.tagsOf(buyer(by)) >= sendCost(); }
  function sendHome(rid, replay, by) {
    var S = w.S, r = member(rid), cost = sendCost();
    if (!canSend(r, by)) return false;
    w.spendTags(cost, buyer(by));
    if (!replay) w.emit('send_home', { cost: cost, type: r.type, rank: r.rank || 0, waves: r.waves || 0 });
    if (S.bed && S.bed.r === r) S.bed = null;
    else S.recruits = S.recruits.filter(function (q) { return q !== r; });
    if (r.name && r.rank) S.sentHome.push({ name: w.SQUAD.rankName(r), waves: r.waves || 0, kills: r.kills || 0 });
    S.shop.gone = Object.assign({}, r, { bed: !!(S.shop.base.bed && S.shop.base.bed.r.id === r.id) }); // the screen's chip, the goodbye
    S.shop.log.push(entry(SEND + rid, by));
    return true;
  }
  function canBuy(it, by) { return eligible(it, by) && (it.tier === 'hire' || !bought(it, by)) && w.tagsOf(buyer(by)) >= costNow(it, by); }

  // ---------- a visit ----------
  function openShop() {
    var S = w.S;
    S.mode = 'shop'; S.waveState = 'shop'; w.clearInput(); S.bullets = []; S.banner = null; S.delivery = null; w.washDecals();
    // Three rotating supplies from one pool (one of them free for each player), both radio calls from wave 3, pizza
    // always, and every role for hire.
    var items = offer(OFFERS, ['pizza', 'strike', 'fighter']), gifts = drawGifts(items);
    var always = ITEMS.filter(function (it) { return it.id === 'pizza' || (it.id === 'strike' && S.wave >= w.FIGHTER.SHOP_WAVE) || (it.id === 'fighter' && S.wave >= w.FIGHTER.SHOP_WAVE); });
    S.shop = { items: items.concat(always), hire: ITEMS.filter(function (it) { return it.tier === 'hire'; }),
      gifts: gifts, giftTaken: {}, bought: {}, who: {}, base: snapshot(S), log: [] };
    w.emit('shop_offer', Object.assign({ wave: S.wave, items: S.shop.items.map(function (it) { return it.id; }), gift: gifts[0] }, S.coop ? { gifts: gifts } : {}));
    w.shopScreen.open();
  }
  function takeItem(id, by) {
    var S = w.S;
    if (by == null && remote('take', id)) return true;
    if (S.mode !== 'shop' || !S.shop || !buy(id, false, by)) return false;
    w.shopScreen.taken(id);
    return true;
  }
  // replay: buying again after a put-back, so the purchase isn't reported twice.
  function buy(id, replay, by) {
    if (isSend(id)) return sendHome(id.slice(SEND.length), replay, by);
    var S = w.S, item = S.shop.items.concat(S.shop.hire).find(function (it) { return it.id === id; });
    // Supplies sell once per visit (per barrel, for a turret upgrade); hiring repeats while slots and tags last.
    if (!item || (bought(item, by) && item.tier !== 'hire') || !eligible(item, by)) return false;
    var gift = onHouse(item, by), cost = costNow(item, by);
    if (w.tagsOf(buyer(by)) < cost) return false;
    w.spendTags(cost, buyer(by));
    if (gift) S.shop.giftTaken[buyer(by)] = true;
    if (!replay) w.emit('purchase', { item: id, tier: item.tier, cost: cost, gift: gift });
    var stacks = stacksOf(item, by);
    S.shop.bought[slot(item, by)] = true; S.shop.who[slot(item, by)] = buyer(by); stacks[id] = (stacks[id] || 0) + 1;
    item.apply(own(item) ? { mods: S.turrets[buyer(by)].mods } : S);
    S.shop.log.push(entry(id, by));
    return true;
  }
  // Putting something back: the shop remembers what you had when it opened (snapshot) and what you took since, in
  // order. It restores that and takes the rest again, so prices, the gift and hiring stay consistent. Anything that
  // only worked because of what went back (a hire into a slot you returned) goes back too.
  function snapshot(S) {
    return { tags: S.players.map(function (p) { return p.tags; }), wallHP: S.wallHP, mods: JSON.parse(JSON.stringify(S.mods)), calls: { bomber: S.calls.bomber, fighter: S.calls.fighter },
      turrets: S.turrets.map(function (t) { return JSON.parse(JSON.stringify(t.mods)); }),
      pizzaOrder: S.pizzaOrder, recruits: S.recruits.map(function (r) { return Object.assign({}, r); }),
      bed: S.bed ? { r: Object.assign({}, S.bed.r), since: S.bed.since } : null, usedNames: Object.assign({}, S.usedNames), sentHome: S.sentHome.slice() };
  }
  function putBack(id, by) {
    var S = w.S;
    if (by == null && remote('back', id)) return true;
    if (S.mode !== 'shop' || !S.shop) return false;
    var at = S.shop.log.lastIndexOf(entry(id, by));
    if (at < 0) return false;
    var keep = S.shop.log.slice(), b = S.shop.base;
    keep.splice(at, 1);
    b.tags.forEach(function (t, i) { S.players[i].tags = t; }); S.wallHP = b.wallHP; S.mods = JSON.parse(JSON.stringify(b.mods)); S.calls = { bomber: b.calls.bomber, fighter: b.calls.fighter };
    b.turrets.forEach(function (m, i) { S.turrets[i].mods = JSON.parse(JSON.stringify(m)); });
    S.pizzaOrder = b.pizzaOrder; S.recruits = b.recruits.map(function (r) { return Object.assign({}, r); }); w.resizeMats();
    S.bed = b.bed ? { r: Object.assign({}, b.bed.r), since: b.bed.since } : null; S.usedNames = Object.assign({}, b.usedNames); S.sentHome = b.sentHome.slice();
    S.shop.bought = {}; S.shop.who = {}; S.shop.giftTaken = {}; S.shop.log = [];
    keep.forEach(function (k) { var e = parse(k); buy(e.id, true, e.by); });
    w.emit('refund', { item: id });
    w.shopScreen.returned(id);
    return true;
  }
  // Undo puts back this player's last pick (a guest's goes through the host).
  function undo(by) {
    if (by == null && remote('undo')) return true;
    var last = lastOf(by);
    return !!last && putBack(last.id, last.by);
  }
  // This player's last pick, or null.
  function lastOf(by) {
    var S = w.S;
    if (!S.shop) return null;
    for (var i = S.shop.log.length - 1; i >= 0; i--) { var e = parse(S.shop.log[i]); if (e.by === buyer(by)) return e; }
    return null;
  }
  // This player's hires this visit, in order (the screen's send-back chips).
  function hiresOf(by) {
    var S = w.S;
    return S.shop ? S.shop.log.map(parse).filter(function (e) { return /^hire-/.test(e.id) && e.by === buyer(by); }).map(function (e) { return e.id; }) : [];
  }
  function continueWave() {
    var S = w.S;
    if (S.mode !== 'shop') return;
    w.queueSketches(S.shop.bought);
    // Whoever was sent home says goodbye on the field as the next wave opens.
    if (sentNow() && S.shop.gone) w.sendOff(S.shop.gone);
    S.shop = null; w.clearInput(); S.mode = 'play';
    w.shopScreen.close();
    // A pizza ordered in the shop is its own little scene before the wave: the courier rides in, everyone is fed,
    // and the wave starts as he rides off (updateWave, units.js updateDelivery). New purchases wait, undrawn, until
    // then. A new flagpole goes up next, in its own scene (game.js openWave). Without either, the wave starts now.
    if (S.pizzaOrder) {
      S.pizzaOrder = false; S.waveState = 'pizza'; S.nextWave = S.wave + 1;
      S.delivery = { x: -30, phase: 'arrive', wait: 0 };
    } else w.openWave(S.wave + 1);
  }
  // Owned upgrades: this player's kit, the squad's lasting supplies and their own barrel's. Repeatable buys (repairs,
  // pizza, hires) aren't kit.
  function kitItems(by) {
    return ITEMS.filter(function (it) { return stacksOf(it, by)[it.id] && it.maxStacks !== Infinity; });
  }

  return { ITEMS: ITEMS, WAR: WAR, war: war, markup: markup, price: price, eligible: eligible, canBuy: canBuy, own: own, stacksOf: stacksOf,
    kitCount: kitCount, kitFull: kitFull, SEND: SEND, isSend: isSend, sendCost: sendCost, sentNow: sentNow, canSend: canSend, member: member, bought: bought, othersBuy: othersBuy, OFFERS: OFFERS, offer: offer, onHouse: onHouse, costNow: costNow,
    openShop: openShop, takeItem: takeItem, putBack: putBack, undo: undo, lastOf: lastOf, hiresOf: hiresOf, continueWave: continueWave, kitItems: kitItems };
};
