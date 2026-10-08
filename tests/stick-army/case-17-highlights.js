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

  emitHook = null; RUN.force = null; reset(); render();
})();
