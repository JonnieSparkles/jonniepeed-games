// Rugged, continue, pause, and the keyboard.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const key = (type, k) => dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
  seed = 404; startRun(); R.fireT = 1e9;
  for (let i = 0; i < 5; i++) { bull.inv = 0; hurtBull(1); }
  check(R.phase === 'dead' && R.hearts === 0, 'five hits and you are rugged');
  step(2.2);
  check(state === 'over' && cardTitle.textContent === 'Rugged.' && goBtn.textContent === 'Continue', 'RUGGED. CONTINUE?');
  goBtn.click();
  check(state === 'play' && R.hearts === TUNE.hearts && R.souls === 0 && R.phase === 'hall', 'continue starts the floor over');

  key('keydown', 'p');
  check(state === 'pause' && !card.hidden && cardTitle.textContent === 'Paused' && !pauseBtn.hidden, 'P pauses');
  const t = R.t; step(1);
  check(R.t === t, 'nothing moves while paused');
  key('keydown', 'Escape');
  check(state === 'play' && card.hidden, 'Escape resumes');

  bull.u = 0; key('keydown', 'ArrowLeft'); step(.2); key('keyup', 'ArrowLeft');
  check(bull.u < -.2, 'arrow keys move');
  const u = bull.u; step(.2);
  check(bull.u === u, 'and stop on release');
  key('keydown', ' '); update(1 / 60);
  check(bull.jh > 0, 'Space jumps');
  step(1); bull.cd = 0; key('keydown', 'j'); update(1 / 60);
  check(bull.slash >= 0, 'J slashes');
  pauseGame(); altBtn.click();
  check(state === 'play' && R.t < .1, 'restart floor from the pause card');
})();
