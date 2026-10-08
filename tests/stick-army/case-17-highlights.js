// Round 8: the medic's white helmet, louder sound, and the yellow highlighter for big moments.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }

  // Medics wear a white helmet with a red cross, in the field, in the squad row and on the shop icon.
  RUN.force = 41; newGame(); startWave(1);
  S.recruits = [makeRecruit(0, 'rifle'), makeRecruit(1, 'medic')];
  var worn = 0, realHelmet = medicHelmet;
  medicHelmet = function (x, y) { worn++; realHelmet(x, y); };
  try { render(); } finally { medicHelmet = realHelmet; }
  check(worn === 2, 'the medic wears it in the field and in the squad row: ' + worn);
  var icon = document.createElement('canvas'); icon.width = icon.height = 132; drawItemIcon(icon, 'hire-medic');
  var px = icon.getContext('2d').getImageData(0, 0, 132, 132).data, red = 0;
  for (var i = 0; i < px.length; i += 4) if (px[i] > 170 && px[i + 1] < 110 && px[i + 2] < 110 && px[i + 3] > 200) red++;
  check(red > 20, 'and on the hire icon');

  // The highlighter: your big moments flash a yellow starburst; big labels get a highlighter swipe.
  RUN.force = 42; newGame(); startWave(6); S.spawn.timer = S.spawn.rushT = S.spawn.cargoT = 99; S.mods.maxHP = S.wallHP = 1e6;
  S.parts = []; S.texts = [];
  var plane = makePlane('plane', 1, 200, 200); S.planes = [plane]; damagePlane(plane, 9, 'player');
  check(S.parts.some(function (q) { return q.k === 'pow'; }), 'downing a plane flashes a starburst');
  S.parts = []; explode(200, GROUND - 4, 42, 'bomb');
  check(!S.parts.some(function (q) { return q.k === 'pow'; }), 'a bomb hitting your ground does not');
  S.parts = []; explode(200, GROUND - 4, 38, 'mine', 'ally');
  check(S.parts.some(function (q) { return q.k === 'pow'; }), 'a mine does');
  S.texts = []; S.combo = 0; award(10, 150, 400, 'bonk!', INK, true);
  check(!S.texts[0].hl, 'a routine kill is not highlighted');
  for (var k = 0; k < 7; k++) award(10, 150, 400, 'bonk!', INK, true);
  var chain = S.texts[0];
  check(S.texts.length === 1 && chain.pts >= HL.PTS && chain.hl && chain.color === INK && chain.size > chain.size0, 'a big chain grows and gets highlighted: ' + chain.s);
  S.texts = []; award(150, 300, 300, 'tank down!', INK, true);
  check(S.texts[0].hl && S.texts[0].kind === 'big', 'big awards are highlighted');
  S.texts = []; addText('cargo down! +750', 5, 300, INK, null, 'big');
  ctx.save(); ctx.font = S.texts[0].size + 'px ' + HAND; var half = ctx.measureText(S.texts[0].s).width / 2; ctx.restore();
  check(S.texts[0].x - half >= 0, 'long labels stay on the page');
  pow(200, 300, 30); render();
  check(ctx.globalCompositeOperation === 'source-over', 'drawing leaves the canvas as it found it');

  emitHook = null; RUN.force = null; reset(); render();
})();
