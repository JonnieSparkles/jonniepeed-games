// A complete, unmodified expert run through player inputs, with and without actual drawing.
(function () {
  const check = (ok, why) => { if (!ok) throw new Error(why); };
  const random = Math.random;
  const run = effects => {
    window.__balanceDriver.begin({ seed: 1, skill: 'expert', profile: window.roofProfiles.expert,
      options: { stage: 'roof', fast: !effects }, cap: 300 });
    let done = false;
    for (let i = 0; i < 30 && !done; i++) done = window.__balanceDriver.run(600).done;
    check(done && R.roof.state === 'clear' && R.hearts > 0, 'expert completes roof using ordinary inputs');
    check(Object.keys(floor.STATES).every(s => R.roof.history.includes(s)), 'a real run visits every roof state');
    return JSON.stringify({ record: window.__balanceDriver.result(), history: R.roof.history, seed });
  };
  const plain = run(false);
  let k = 17; Math.random = () => (k = (k * 16807) % 2147483647) / 2147483647;
  const drawn = run(true);
  Math.random = random;
  check(plain === drawn, 'same seed gives identical events and outcomes with real roof drawing and different cosmetics');
  emitHook = null; RUN.force = null; checkpoint = null; newRun(); setState('title'); showCard('title');
})();
