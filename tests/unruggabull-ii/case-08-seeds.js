// Seeds: #seed= fixes a run, runs vary without one, and drawing or cosmetic randomness never change a run.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  // A simple player through input paths only: line up with the nearest target, shoot, slash what's close.
  function play(frames, render) {
    for (let i = 0; i < frames; i++) {
      let tgt = null;
      for (const cb of R.cubs) if (cb.temp && !cb.temp.dead && cb.temp.pop > .4) { const at = posOf(cb.temp); if (at.z > .05 && (!tgt || at.z < tgt.z)) tgt = at; }
      for (const f of R.flies) if (f.z > .1 && (!tgt || f.z < tgt.z)) tgt = f;
      keys.kbLeft = !!tgt && tgt.u < bull.u - .05; keys.kbRight = !!tgt && tgt.u > bull.u + .05; keys.kbShoot = !!tgt;
      if (R.projs.some(p => !p.friendly && p.z - bull.bz < .14 && Math.abs(p.u - bull.u) < .3) || R.flies.some(f => f.z - bull.bz < .12 && Math.abs(f.u - bull.u) < .3)) press('slash');
      update(1 / 60);
      if (render) draw();
    }
    keys.kbLeft = keys.kbRight = keys.kbShoot = false;
    return JSON.stringify({ t: R.t.toFixed(4), dist: R.dist.toFixed(5), souls: R.souls, hearts: R.hearts, charge: R.charge, beat: R.beat, phase: R.phase,
      u: bull.u.toFixed(5), flies: R.flies.map(f => f.u.toFixed(4) + ',' + f.z.toFixed(4)), projs: R.projs.length, cubs: R.cubs.length, seed });
  }
  RUN.force = 4242; startRun();
  const plain = play(60 * 40, false);
  const realRandom = Math.random;
  let k = 7; Math.random = () => (k = (k * 16807) % 2147483647) / 2147483647;   // different cosmetic randomness
  RUN.force = 4242; startRun();
  const drawn = play(60 * 40, true);
  Math.random = realRandom;
  check(plain === drawn, 'the same seed plays out the same, drawn or not, whatever the cosmetic randomness');
  RUN.force = 4243; startRun();
  check(play(60 * 40, false) !== plain, 'another seed plays out differently');

  RUN.force = null; history.replaceState(null, '', location.pathname); newRun(); const a = RUN.seed; newRun();
  check(RUN.seed !== a, 'runs vary without a seed');
  location.hash = 'seed=42'; newRun();
  check(RUN.seed === 42, '#seed=42 fixes the run seed');
  location.hash = 'tune&seed=7';
  check(hashSeed() === 7 && hashTokens().indexOf('tune') >= 0, '#seed combines with other tokens');
  history.replaceState(null, '', location.pathname);

  // The event hook reports kills, hits and the end of a run.
  const seen = []; emitHook = (type, data) => seen.push(type + ':' + (data.cause || data.by || data.item || data.kind || ''));
  RUN.force = 4242; startRun(); play(60 * 20, false);
  for (let i = 0; i < 5; i++) { bull.inv = 0; hurtBull(1, 'test'); }
  emitHook = null;
  check(seen.some(e => e.startsWith('soul:')) && seen.includes('hit:test') && seen.includes('game_over:test'), 'events: souls, hits and the game over cause');
  setState('title'); showCard('title');
})();
