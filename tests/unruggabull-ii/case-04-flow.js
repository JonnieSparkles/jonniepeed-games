// The story, rugged, continue, pause, and the keyboard.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const key = (type, k) => dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
  try { localStorage.removeItem('unruggabull-ii-story'); } catch (e) {}
  newRun(); setState('title'); showCard('title');
  check(altBtn.hidden, 'no story link before the story has been seen');
  goBtn.click();
  check(state === 'intro' && !crawl.hidden && card.hidden, 'the first Start tells the story');
  step(.5);
  check(crawlText.textContent.length > 0 && crawlText.textContent.length < STORY[0].length, 'it types out');
  advanceIntro();
  step(.05);
  check(crawlText.textContent === STORY[0], 'a tap shows the whole line');
  advanceIntro();
  check(intro.i === 1, 'another moves on');
  key('keydown', 'Escape');
  check(state === 'play' && crawl.hidden && storySeen(), 'Escape skips to the floor');
  check(R.banner && R.banner.text === 'FLOOR 13' && R.banner.then.text === 'FREE ' + TUNE.goal + ' SOULS', 'the floor opens with its goal');
  setState('title'); showCard('title');
  check(!altBtn.hidden && altBtn.textContent === 'Watch the story', 'the story can be watched again');
  goBtn.click();
  check(state === 'play', 'later Starts go straight to the floor');

  seed = 404; startRun();
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
  step(1); bull.cd = 0; key('keydown', 'k'); update(1 / 60);
  check(bull.slash >= 0, 'K slashes');
  R.events.shots = 0; R.fireT = 0; key('keydown', 'j'); step(.5);
  check(R.events.shots >= 2, 'J shoots while held');
  key('keyup', 'j'); R.events.shots = 0; step(.5);
  check(R.events.shots === 0, 'and stops on release');
  key('keydown', 'ArrowUp'); step(.1);
  check(bull.jh > 0, 'Up jumps');
  pauseGame(); altBtn.click();
  check(state === 'play' && R.t < .1, 'restart floor from the pause card');
})();
