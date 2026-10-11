// Snares, rain's wind tell, parapets, player inputs and hit safety.
(function () {
  const check = (ok, why) => { if (!ok) throw new Error(why); };
  const tick = s => { for (let i = 0; i < Math.ceil(s * 60); i++) update(1 / 60); };
  function fresh() { newRun(null, 'roof'); setState('play'); clearHeld(); input.jump = input.slash = input.shoot = 0; floor.enter('round2'); }
  fresh(); floor.launchSnare(); tick(1.2);
  check(R.roof.snare.hooked && bull.bz > 0, 'snare hooks and reels the bull');
  press('slash'); tick(.05);
  check(!R.roof.snare && R.roof.flinch > 0 && R.talk.text === 'RECALCULATING.', 'actual slash input cuts a hooked snare and flinches the eye');
  check(R.hearts === 5, 'cut snare costs no heart');
  fresh(); floor.launchSnare(); tick(4.5);
  check(!R.roof.snare && R.hearts === 4 && bull.bz === 0 && R.lastCause === 'snare', 'fully reeled in costs one heart and throws him back');
  fresh(); floor.startGust(); const u = bull.u;
  tick(.5); check(bull.u === u && R.roof.gust && !R.roof.gust.blown, 'rain leans before the gust pushes');
  const dir = R.roof.gust.dir; tick(1.4);
  check(bull.u === dir * floor.ROOF.aisle, 'gust stops at the parapet, inside the roof');
  // A low-odds ring is usually safe, but seeded variance can reach it.
  fresh(); let variance = false;
  for (let i = 0; i < 100; i++) { floor.volley(); if (R.roof.volley.orbs.some(o => o.target === 2)) variance = true; }
  check(variance, 'lowest-odds ring is not guaranteed safe');
  // Draw only: neither rain nor renderer consumes the game's outcomes stream.
  const before = seed, q = JSON.stringify(R.roof); draw(); draw();
  check(seed === before && JSON.stringify(R.roof) === q, 'roof drawing never changes fight state or seeded stream');
  checkpoint = null; newRun(); setState('title'); showCard('title');
})();
