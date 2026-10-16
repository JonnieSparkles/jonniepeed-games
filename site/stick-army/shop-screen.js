// Stick Army's shop screen: draws the field supplies between waves from what shop.js decides, and turns taps into
// its calls. Nothing here changes the game; shop.js does. Classic script; load after shop.js and before game.js,
// which calls StickArmyShopScreen(world, shop) once and sets world.shopScreen. The kit display (shop, pause card)
// lives here too.
var StickArmyShopScreen = function (w, shop) {
  'use strict';
  var ITEMS = shop.ITEMS;
  var screen = document.getElementById('shopScreen'), pauseBtn = document.getElementById('pauseBtn');
  function $(id) { return document.getElementById(id); }
  function focusFirst(sel) { (screen.querySelector(sel) || $('continueBtn')).focus({ preventScroll: true }); }

  // ---------- opening, closing and reacting ----------
  function open() {
    picked = null;
    screen.hidden = false; pauseBtn.hidden = true; render();
    // Every visit starts at the top of the list.
    screen.scrollTop = 0; screen.querySelector('.shop-stock').scrollTop = 0;
    w.sound.play('shop');
    focusFirst('button:not(:disabled)');
  }
  function close() {
    screen.hidden = true; pauseBtn.hidden = false;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  // After a purchase: the ding, the new state, and focus on the next thing to buy.
  function taken() {
    w.sound.play('recruit'); render();
    if (w.S.mode === 'shop') focusFirst('.shop-stock button:not(:disabled)');
  }
  // After a put-back: the tink, and focus back on what was returned.
  function returned(id) {
    w.sound.play('tink'); render();
    focusFirst('[data-item="' + id + '"]:not(:disabled)');
  }

  // ---------- drawing ----------
  // The "Your gun" section (co-op only), made once beside the supplies.
  function gunSection() {
    var s = $('gunSection');
    if (s) return s;
    s = document.createElement('section'); s.id = 'gunSection'; s.setAttribute('aria-labelledby', 'gunTitle'); s.hidden = true;
    var h = document.createElement('h3'); h.id = 'gunTitle'; h.textContent = 'Your gun';
    var note = document.createElement('p'); note.className = 'tag-note'; note.textContent = 'For your barrel only.';
    var list = document.createElement('div'); list.className = 'deal-list';
    s.append(h, note, list);
    var supplies = $('supplyItems').closest('section');
    supplies.parentNode.insertBefore(s, supplies);
    return s;
  }
  function bossHint(c) {
    if (!c.boss) return c.night ? ' Heads up: a night raid is coming.' : '';
    return ' Heads up: ' + (c.bossKind === 'dread' ? 'the Dreadnought is' : c.twin ? 'two zeppelins are' : 'a zeppelin is') + ' coming.';
  }
  // The shop as it stands for this device's player (w.me): their tags, their gift, their gun.
  function render() {
    var S = w.S, coop = !!S.coop, mine = w.tagsOf(w.me);
    $('shopWave').textContent = w.shopLine();
    $('shopCoins').textContent = mine + ' dog tags' + (coop ? ' (yours)' : '');
    var news = $('shopNews'); news.textContent = S.news.join(' '); news.hidden = !S.news.length;
    var hurt = Math.round(S.stats.wallDamage - (S.waveStart.wall || 0));
    $('shopReport').textContent = (S.stats.kills - S.waveStart.kills) + ' down · ' + (S.stats.captured - S.waveStart.captured) + ' recruited · wall ' +
      (hurt > 0 ? '-' + hurt : 'untouched') + ' (' + Math.ceil(S.wallHP) + '/' + S.mods.maxHP + ')';
    var giftLeft = !S.shop.giftTaken[w.me] && S.shop.gifts[w.me];
    $('shopHint').textContent = (giftLeft ? 'One supply is on the house' + (coop ? ' for you. ' : '. ') : '') +
      (coop ? 'Your tags are your own; anything for the squad is for both of you.' : giftLeft ? 'Spend dog tags on the rest, or save them.' : 'Spend dog tags on what you like, or save them.') +
      bossHint(w.waveCfg(w.nextWave()));
    function costLabel(it) {
      if (it.id === 'pizza' && S.pizzaOrder) return 'On its way ✓';
      if (it.blocked && it.blocked() && !shop.bought(it)) return it.blocked();
      if (!shop.bought(it) && shop.kitFull(it)) return 'Kit full';
      if (shop.othersBuy(it)) return 'Bought by your friend';
      if (it.tier !== 'hire' && shop.bought(it)) return 'Packed ✓';
      if (shop.onHouse(it)) return 'Free!';
      return shop.price(it) + ' tags';
    }
    // How many more tags an unaffordable supply needs. It sits on its own line under the price, so the row keeps
    // its width and doesn't jump when the balance changes.
    function needMore(it) {
      return it.tier !== 'hire' && !shop.bought(it) && !shop.onHouse(it) && shop.eligible(it) && mine < shop.price(it) ? shop.price(it) - mine : 0;
    }
    // Supplies are compact rows, one of them on the house; hiring is a grid of role chips.
    function itemButton(it, cls, withDesc) {
      var button = document.createElement('button'), theirs = shop.othersBuy(it), packed = it.tier !== 'hire' && shop.bought(it);
      button.type = 'button'; button.dataset.item = it.id;
      // This player's gift wears the badge.
      var free = shop.onHouse(it) && !theirs;
      button.className = cls + (free ? ' gift' : '') + (packed ? ' bought' : '');
      // A packed supply stays live: tapping it again puts it back (the buyer's only).
      button.disabled = theirs || (!packed && !shop.canBuy(it));
      var icon = document.createElement('canvas'); icon.className = 'supply-icon'; icon.width = icon.height = 132; icon.setAttribute('aria-hidden', 'true');
      w.drawItemIcon(icon, it.id);
      var name = document.createElement('strong'); name.textContent = it.name;
      var label = document.createElement('em'); label.textContent = it.tier === 'hire' ? (it.blocked && it.blocked()) || String(shop.price(it)) : costLabel(it);
      button.append(icon, name);
      if (withDesc) { var desc = document.createElement('span'); desc.textContent = it.desc; button.append(desc); }
      else button.title = it.desc;
      if (free) { var was = document.createElement('s'); was.textContent = shop.price(it); label.prepend(was, ' '); }
      if (needMore(it)) { var more = document.createElement('small'); more.textContent = 'need ' + needMore(it) + ' more'; label.append(more); }
      if (packed && !theirs) { var back = document.createElement('small'); back.textContent = 'tap to put back'; label.append(back); }
      button.append(label);
      button.addEventListener('click', function () {
        if (packed) { shop.putBack(it.id); return; }
        // On a phone the hired row can sit just below the fold; bring it up so the send-back chip is in sight.
        if (shop.takeItem(it.id) && it.tier === 'hire') $('hiredItems').scrollIntoView({ block: 'nearest' });
      });
      return button;
    }
    function fill(list, items, cls, withDesc) { list.replaceChildren.apply(list, items.map(function (it) { return itemButton(it, cls, withDesc); })); }
    // Co-op: the turret upgrades on offer go under "Your gun", above the squad's supplies.
    var gunList = coop ? S.shop.items.filter(shop.own) : [], gun = gunSection();
    gun.hidden = !gunList.length;
    fill(gun.querySelector('.deal-list'), gunList, 'deal', true);
    $('supplyTitle').textContent = coop ? 'For the squad' : 'Supplies';
    fill($('supplyItems'), S.shop.items.filter(function (it) { return gunList.indexOf(it) < 0; }), 'deal', true);
    var up = Math.round((shop.war(shop.WAR.SUPPLY) - 1) * 100), vet = shop.markup() > 1;
    $('supplyNote').textContent = 'Dog tags come from kills, planes and cleared waves.' +
      (vet ? ' Veteran prices: up ' + up + '%.' : up >= 10 ? ' Supplies are running short: prices are up ' + up + '%.' : '') +
      (w.lv().KIT < Infinity ? ' Your kit holds ' + w.lv().KIT + '.' : '');
    // Every role is always listed, so the list never changes shape; what you can't hire is greyed.
    fill($('hireItems'), S.shop.hire, 'hire', false);
    // Who you hired this visit: tap one to send him back and get the tags back.
    var hired = $('hiredItems'), hires = shop.hiresOf();
    hired.replaceChildren.apply(hired, hires.map(function (id) {
      var it = ITEMS.find(function (q) { return q.id === id; }), chip = document.createElement('button'), icon = document.createElement('canvas'), name = document.createElement('span');
      chip.type = 'button'; chip.className = 'hired-chip'; chip.dataset.hired = id; chip.title = 'Send back';
      icon.width = icon.height = 88; icon.setAttribute('aria-hidden', 'true'); w.drawItemIcon(icon, id);
      name.textContent = it.name + ' ↩'; chip.setAttribute('aria-label', 'Send back the ' + it.name.toLowerCase());
      chip.append(icon, name); chip.addEventListener('click', function () { shop.putBack(id); });
      return chip;
    }));
    hired.hidden = !hires.length;
    $('hireNote').textContent = w.freeSlot(0) < 0 ? 'Squad full. Unlock a slot, or send someone home, to hire.' : 'Price rises with each hire. Catch them on the mat for free.';
    renderSquad();
    $('shopSquad').textContent = w.squadLine(true) || 'Nobody yet. Catch them on the mat, or hire.';
    renderKit($('loadout'), false);
    // Undo puts back this player's last pick, hires included.
    var undoBtn = $('undoBtn'), last = shop.lastOf();
    undoBtn.hidden = !last;
    if (last) undoBtn.textContent = '↩ Undo ' + (shop.isSend(last.id) ? 'send home' : ITEMS.find(function (it) { return it.id === last.id; }).name.toLowerCase());
    $('continueBtn').textContent = w.waveName(w.nextWave()) + ' →';
    if (w.afterShop) w.afterShop();
  }

  // ---------- the squad, and sending a soldier home ----------
  // The squad as it stands, redrawn as you hire, train or put things back (round 14: "show squad status on store"):
  // every slot as in the HUD, with roles, stripes and health. Each soldier is a button (round 20): tap one to see
  // them and a "Send home" button; tap again to let them be. One a visit; whoever went home shows as a chip that
  // brings them back (shop.js sendHome, putBack).
  var picked = null;
  var ROLE = { rifle: 'Rifleman', engineer: 'Engineer', bazooka: 'Bazooka', sniper: 'Sniper', medic: 'Medic', radio: 'Radio operator' };
  function who(r) { return r.name && r.rank ? w.SQUAD.rankName(r) : 'Rookie ' + (ROLE[r.type] || 'soldier').toLowerCase(); }
  function record(r, bed) {
    var n = r.waves || 0, bits = [ROLE[r.type] || 'Soldier', n + (n === 1 ? ' wave' : ' waves') + ', ' + w.SQUAD.killsText(r.kills || 0)];
    if (bed) bits.push('in the tent'); else if (r.down) bits.push('wounded');
    return bits.join(' · ');
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function renderSquad() {
    var S = w.S, sent = shop.sentNow(), mine = w.tagsOf(w.me), slots = w.squadSlots(true), row = $('shopSquadRow');
    if (picked != null && (!shop.member(picked) || shop.member(picked).fresh)) picked = null;
    row.replaceChildren.apply(row, slots.map(function (s, i) {
      var fig = document.createElement('canvas'); fig.setAttribute('aria-hidden', 'true'); w.drawSquadFig(fig, s, i);
      if (!s.r) { var empty = el('span', 'squad-slot empty'); empty.append(fig); return empty; }
      var id = String(s.r.id), b = el('button', 'squad-slot' + (picked === id ? ' picked' : picked != null ? ' dim' : ''));
      // Someone hired this visit can't be sent home: their chip under Hire puts them back for the full price.
      b.type = 'button'; b.dataset.recruit = id; b.disabled = !!sent || !!s.r.fresh;
      b.setAttribute('aria-label', who(s.r) + ', ' + record(s.r, s.bed) + (s.r.fresh ? ', hired this visit' : '')); b.setAttribute('aria-pressed', picked === id ? 'true' : 'false');
      b.append(fig);
      b.addEventListener('click', function () { picked = picked === id ? null : id; render(); });
      return b;
    }));
    var box = $('sendBox'), hint = $('squadHint'), p = picked != null ? shop.member(picked) : null;
    box.replaceChildren();
    if (p && !sent) {
      var bed = !!(S.bed && S.bed.r === p), info = el('div'), cost = shop.sendCost(), short = mine < cost;
      info.append(el('strong', null, who(p)), el('span', null, record(p, bed)));
      var send = el('button', 'send-home'); send.type = 'button'; send.disabled = short;
      send.append('Send home', el('small', null, short ? 'need ' + (cost - mine) + ' more' : cost + ' tags'));
      send.addEventListener('click', function () { var id = picked; picked = null; if (!shop.takeItem(shop.SEND + id)) { picked = id; render(); } });
      var card = el('div', 'send-card'); card.append(info, send); box.append(card);
    } else if (sent) {
      var gone = w.S.shop.gone;
      var line = el('div', 'sent-home'), chip = el('button', 'sent-chip', (gone ? who(gone) : 'Soldier') + ' ↩');
      chip.type = 'button'; chip.setAttribute('aria-label', 'Bring ' + (gone ? who(gone) : 'them') + ' back');
      // Only whoever sent them can bring them back (co-op), as with anything bought.
      chip.disabled = sent.by !== w.me;
      chip.addEventListener('click', function () { shop.putBack(sent.id); });
      line.append(el('span', null, 'Sent home:'), chip); box.append(line);
    }
    box.hidden = !box.childNodes.length;
    hint.textContent = sent ? 'Tap the name to bring them back.' : p ? 'They hand in their kit and walk off the page.' : 'Tap a soldier to send em home.';
    hint.hidden = !sent && !slots.some(function (s) { return s.r; });
    // While someone is picked, the tags show what sending them would leave; nothing is spent until Send home.
    if (p && !sent && mine >= shop.sendCost()) $('shopCoins').textContent = mine + ' → ' + (mine - shop.sendCost()) + ' dog tags' + (S.coop ? ' (yours)' : '');
  }

  // This player's kit as pencil icons: icon-only with counts in the shop, icon and name on the pause card.
  function renderKit(holder, named) {
    var items = shop.kitItems();
    holder.replaceChildren();
    if (!items.length) { var none = document.createElement('span'); none.className = 'kit-empty'; none.textContent = 'No kit yet. A fresh page.'; holder.append(none); }
    items.forEach(function (it) {
      var n = shop.stacksOf(it)[it.id], chip = document.createElement('span'), icon = document.createElement('canvas'), text = document.createElement('span');
      chip.className = 'kit-item'; chip.title = it.name + (n > 1 ? ' ×' + n : '');
      icon.width = icon.height = 88; icon.setAttribute('aria-hidden', 'true'); w.drawItemIcon(icon, it.id);
      text.className = named ? 'kit-name' : 'sr'; text.textContent = it.name + (n > 1 ? ' ×' + n : '');
      chip.append(icon, text);
      if (!named && n > 1) { var count = document.createElement('b'); count.setAttribute('aria-hidden', 'true'); count.textContent = '×' + n; chip.append(count); }
      holder.append(chip);
    });
    // On Veteran, how full the kit is.
    if (w.lv().KIT < Infinity) { var room = document.createElement('span'); room.className = 'kit-room'; room.textContent = shop.kitCount() + ' of ' + w.lv().KIT; holder.append(room); }
    return items.length;
  }

  return { open: open, close: close, taken: taken, returned: returned, render: render, renderKit: renderKit };
};
