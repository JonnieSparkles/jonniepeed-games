// Round 7 calmer page: kill labels merge, routine labels share a small budget, threats and the squad always show,
// labels step around each other and stay below the HUD band, and dog tags from one burst fly as one.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  function says() { return S.texts.map(function (q) { return q.s; }).join(' | '); }
  RUN.force = 31; newGame(); startWave(5); S.spawn.timer = 99; S.texts = []; S.parts = [];

  // Kills close together in time and place read as one running label.
  award(10, 200, 400, OUCH[0], INK, true); award(10, 210, 405, OUCH[1], INK, true); award(10, 190, 398, OUCH[2], INK, true);
  check(S.texts.length === 1 && S.texts[0].s === OUCH[0] + ' ×3 +60', 'three quick kills, one label: ' + says());
  check(S.texts[0].kind === 'score' && S.texts[0].size < TEXT.KIND.story.size, 'routine kills are small');
  award(10, 420, 400, 'bonk!', INK, true);
  check(S.texts.length === 2, 'a kill elsewhere gets its own label');
  // Later at the same spot it is a new label, stepped clear of the old one.
  S.t += 0.5; award(10, 200, 400, OUCH[0], INK, true);
  var a = S.texts[0], b = S.texts[2];
  check(S.texts.length === 3 && Math.abs(a.y - b.y) >= (a.size + b.size) * 0.45, 'a new label steps out of the way: ' + a.y + ' ' + b.y);

  // Routine labels share a budget; alerts, squad news and big awards always show.
  S.texts = [];
  for (var i = 0; i < 12; i++) addText('pop!', 60 + i * 28, 300 + (i % 3) * 60, INK, null, 'minor');
  var routine = S.texts.filter(function (q) { return q.kind === 'score' || q.kind === 'minor'; }).length;
  check(routine === TEXT.BUDGET, 'routine labels stop at the budget: ' + routine);
  addText('sniper!', 100, 300, RED); addText('man down!', 200, 500, BLUE, 20); award(150, 300, 300, 'tank down!', INK, true);
  check(S.texts.some(function (q) { return q.s === 'sniper!' && q.kind === 'alert'; }), 'red threats always show');
  check(S.texts.some(function (q) { return q.s === 'man down!' && q.kind === 'story'; }), 'squad news always shows');
  check(S.texts.some(function (q) { return /^tank down!/.test(q.s) && q.kind === 'big'; }), 'big awards always show');

  // Wall damage from one burst is one running total.
  S.texts = []; wallText(6); S.t += 0.1; wallText(6); wallText(4);
  check(S.texts.length === 1 && S.texts[0].s === 'wall -16', 'wall damage adds up: ' + says());

  // Nothing is placed in or drifts into the HUD band.
  S.texts = []; addText('rush!', 200, 10, RED);
  check(S.texts[0].y >= TEXT.TOP, 'placed below the HUD band');
  for (var f = 0; f < 70; f++) update(1 / 60);
  check(S.texts.every(function (q) { return q.y >= TEXT.TOP; }), 'and it never drifts up into it');

  // Alerts draw over everything else.
  S.texts = []; addText('rush!', 200, 300, RED); addText('bonk! +10', 200, 300, INK2, null, 'score');
  var order = [], realFill = ctx.fillText;
  ctx.fillText = function (s) { order.push(s); return realFill.apply(ctx, arguments); };
  try { render(); } finally { ctx.fillText = realFill; }
  check(order.indexOf('rush!') > order.indexOf('bonk! +10'), 'alerts on top');

  // Dog tags from one burst fly as one bundle, and only a few bundles fly at once.
  S.parts = []; flyTags(100, 300, 2); flyTags(110, 310, 3);
  var tags = S.parts.filter(function (q) { return q.k === 'tag'; });
  check(tags.length === 1 && tags[0].n === 5, 'one burst, one bundle');
  for (var k = 0; k < 12; k++) flyTags(40 + k * 60, 200 + (k % 2) * 200, 1);
  tags = S.parts.filter(function (q) { return q.k === 'tag'; });
  check(tags.length <= 6 && tags.reduce(function (n, q) { return n + q.n; }, 0) === 17, 'a pile-up folds tags without losing any');

  // The wave start comes one thing at a time. HQ's bomber at the first tank wave is in the banner, not a label.
  RUN.force = 32; newGame(); S.texts = []; startWave(TANK.WAVE);
  check(S.calls.bomber === 1 && S.banner.sub === 'tanks! +1 air strike from HQ' && !S.texts.length, 'the HQ call is in the banner');
  newGame(); S.calls.bomber = 1; S.calls.fighter = 1; var tags0 = S.coins; startWave(TANK.WAVE);
  check(/radio full/.test(S.banner.sub) && S.coins === tags0 + RADIO.FULL_TAGS && !S.texts.length, 'a full radio is in the banner too');
  // So is the zeppelin's.
  newGame(); startWave(5); S.texts = []; var zep = spawnZeppelin(); zep.x = 200; zeppelinDown(zep, 'player');
  check(S.banner.sub === 'catch the crew! +1 air strike' && !S.texts.some(function (q) { return /air strike/.test(q.s); }), 'the zeppelin reward is in its banner');
  // Every banner subtitle fits the page.
  G = ctx; ctx.save(); ctx.font = '24px ' + HAND;
  var subs = ['tanks! +1 air strike from HQ', 'tanks! radio full: +' + RADIO.FULL_TAGS + ' tags', 'catch the crew! +1 air strike', 'catch the crew! +' + RADIO.FULL_TAGS + ' tags'];
  for (var n = 1; n <= 12; n++) { newGame(); startWave(n); subs.push(S.banner.sub); }
  var widest = Math.max.apply(null, subs.map(function (s) { return ctx.measureText(s).width; }));
  ctx.restore();
  check(widest < W - 30, 'banner subtitles fit: ' + widest);

  // Pizza waits for the banner and the sketches, then rides in.
  RUN.force = 33; newGame(); S.wave = 4; S.coins = 999; openShop();
  takeItem('pizza'); ITEMS.find(function (x) { return x.id === 'wire'; }).apply(S); S.shop.bought.wire = true;
  continueWave(); S.spawn.timer = S.spawn.rushT = S.spawn.cargoT = 99;
  var queued = 0;
  for (f = 0; f < 600 && S.delivery && S.delivery.phase === 'queue'; f++) { update(1 / 60); queued += 1 / 60; }
  check(queued >= WAVE_BANNER - 0.05 && !S.banner && !S.sketches.length && S.delivery.phase === 'arrive', 'the courier comes last: ' + queued.toFixed(2));
  for (f = 0; f < 600 && S.delivery.phase === 'arrive'; f++) update(1 / 60);
  check(S.delivery.phase === 'serve', 'and still delivers');

  // The sketch tool is a blue ballpoint.
  var fills = [], proto = Object.getPrototypeOf(ctx), fillDesc = Object.getOwnPropertyDescriptor(proto, 'fillStyle');
  Object.defineProperty(ctx, 'fillStyle', { configurable: true, get: function () { return fillDesc.get.call(ctx); }, set: function (v) { fills.push(v); fillDesc.set.call(ctx, v); } });
  try { G = ctx; sketchReveal(0.5, [100, 400, 160, 460], 'right', function () {}); } finally { delete ctx.fillStyle; }
  check(fills.indexOf(BLUE) >= 0 && fills.indexOf(HAT) < 0, 'blue pen, not a yellow pencil');

  // The zeppelin's health bar comes in with the hull instead of waiting at the page edge.
  RUN.force = 34; newGame(); startWave(5); S.planes = [];
  var z = spawnZeppelin(); z.x = -60; z.entered = false;
  function barX() {
    var at = null, real = ctx.fillRect;
    ctx.fillRect = function (x, y, w2) { if (at === null && w2 === 96) at = x + 48; return real.apply(ctx, arguments); };
    try { G = ctx; drawBossBar(); } finally { ctx.fillRect = real; }
    return at;
  }
  check(Math.abs(barX() - z.x) < 0.01, 'off the page, the bar is off the page with it');
  z.x = 30; check(Math.abs(barX() - 30) < 0.01, 'sliding in, it rides on the hull');
  z.entered = true; z.x = 200; check(Math.abs(barX() - 200) < 0.01, 'over the field, it rides on the hull');
  z.x = 20; check(barX() >= 60, 'once arrived, it stays on the page while the hull turns');

  // A busy page thins its effects: fewer flecks, every other puff, fewer pieces per kill.
  RUN.force = 35; newGame(); startWave(5); S.spawn.timer = S.spawn.rushT = S.spawn.cargoT = S.spawn.bossT = 99;
  S.parts = []; burst(200, 300, 12, INK, 100);
  check(S.parts.length === 12, 'a quiet page gets the full burst');
  var filler = []; for (var q = 0; q <= FX.BUSY; q++) filler.push({ k: 'star', x: 0, y: 0, life: 9, max: 9, id: -q });
  S.parts = filler.slice(); burst(200, 300, 12, INK, 100);
  check(S.parts.length - filler.length === 4, 'a busy page gets a third');
  S.parts = filler.slice(); for (q = 0; q < 10; q++) puff(200, 300, 4, 0.5);
  check(S.parts.length - filler.length === 5, 'and every other puff');
  S.parts = filler.slice(); spawnTrooper(200, 300); killTrooper(S.troopers[0], 'player');
  check(S.parts.filter(function (p) { return p.k === 'body'; }).length === 4, 'and a kill in four pieces, not six');

  // Ground ink fades a little during a wave, not only in the shop.
  S.parts = []; addDecal({ kind: 'splat', x: 100, y: GROUND, r: 3, color: RED, a: 0.36, seed: 1 });
  var mark = decals[decals.length - 1], clears = 0, realClear = dcx.clearRect;
  dcx.clearRect = function () { clears++; return realClear.apply(dcx, arguments); };
  try { for (f = 0; f < Math.ceil(DECAL.EVERY * 60) + 2; f++) update(1 / 60); } finally { dcx.clearRect = realClear; }
  check(Math.abs(mark.a - 0.36 * DECAL.FADE) < 1e-9, 'ink fades during the wave: ' + mark.a);
  check(clears === 0, 'in one pass, without redrawing every mark');
  for (f = 0; f < Math.ceil(DECAL.EVERY * 60) * 6; f++) update(1 / 60);
  check(decals.indexOf(mark) < 0, 'and old marks go');

  // In the shop, the gift looks like any other row until it's taken, and bought supplies don't look unavailable.
  RUN.force = 36; newGame(); S.wave = 4; S.coins = 999; openShop(); document.activeElement.blur();
  function look(b) { var c = getComputedStyle(b); return [c.backgroundColor, c.borderTopColor, c.color, c.boxShadow].join(' / '); }
  var deals = function () { return [].slice.call(document.querySelectorAll('#supplyItems .deal')); };
  var gift = deals().find(function (b) { return b.classList.contains('gift'); }), plain = deals().find(function (b) { return !b.classList.contains('gift') && !b.disabled; });
  check(gift && plain && look(gift) === look(plain), 'the gift is not highlighted as if chosen: ' + (gift && look(gift)) + ' vs ' + (plain && look(plain)));
  var pick = S.shop.items.find(function (it) { return it.id !== S.shop.gift && it.id !== 'pizza' && eligible(it) && costNow(it) <= S.coins; });
  check(takeItem(pick.id), 'buy one');
  S.coins = 0; renderShop(); document.activeElement.blur();
  var packed = document.querySelector('#supplyItems [data-item="' + pick.id + '"]'), grey = deals().find(function (b) { return b.disabled && !b.classList.contains('bought'); });
  check(packed.classList.contains('bought') && /Packed/.test(packed.textContent) && packed.disabled, 'a bought supply says it is packed');
  check(grey && getComputedStyle(packed).color !== getComputedStyle(grey).color && getComputedStyle(packed).borderTopColor !== getComputedStyle(grey).borderTopColor, 'and does not look unavailable');
  var tag = grey.querySelector('em'), more = tag.querySelector('small');
  check(/^\d+ tags$/.test(tag.firstChild.textContent) && more && /^need \d+ more$/.test(more.textContent) && getComputedStyle(more).display === 'block', 'what you still need sits on its own line under the price');
  shopScreen.hidden = true; S.shop = null; S.mode = 'play';

  emitHook = null; RUN.force = null; reset(); render();
})();
