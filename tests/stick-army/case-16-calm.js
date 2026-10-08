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

  emitHook = null; RUN.force = null; reset(); render();
})();
