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
  for (let k = 0; k < 50 && intro.i < 0; k++) step(.1);
  check(intro.i === 0, 'the first still starts once its pictures are in (or after 4 s at most)');
  step(.5);
  check(crawlText.textContent.length > 0 && crawlText.textContent.length < STORY[0].length, 'it types out');
  advanceIntro();
  step(.05);
  check(crawlText.textContent === STORY[0], 'a tap shows the whole line');
  step(5);
  check(intro.i === 0 && !more.hidden && !moreTap.hidden, 'the still waits for a tap, with the arrow and Tap');
  advanceIntro();
  check(intro.i === 1, 'another moves on');
  step(intro.total + 1);
  check(!more.hidden && moreTap.hidden, 'later stills show the arrow without Tap');
  check(UnrugIntro.tap(1, 410, 128, intro.t, intro.plan) === 'armorClank' && intro.i === 1, 'a tap on Loomy blinks it and stays');
  check(UnrugIntro.tap(1, 40, 40, intro.t, intro.plan) === null, 'a tap elsewhere advances');
  key('keydown', 'Escape');
  check(state === 'play' && crawl.hidden && storySeen(), 'Escape skips to the floor');
  check(R.banner && R.banner.text === 'THE 13TH FLOOR' && R.banner.then.text === 'FREE ' + TUNE.goal + ' SOULS', 'the floor opens with its goal');
  setState('title'); showCard('title');
  check(!altBtn.hidden && altBtn.textContent === 'Watch the story', 'the story can be watched again');
  goBtn.click();
  check(state === 'play', 'later Starts go straight to the floor');

  RUN.force = 404; startRun();
  for (let i = 0; i < 5; i++) { bull.inv = 0; hurtBull(1); }
  check(R.phase === 'dead' && R.hearts === 0, 'five hits and you are rugged');
  step(TUNE.deadWait + .3);
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
  step(1);
  const code = (type, k, c) => dispatchEvent(new KeyboardEvent(type, { key: k, code: c, bubbles: true }));
  R.events.shots = 0; R.fireT = 0; R.charge = TUNE.charges; code('keydown', 'Shift', 'ShiftLeft'); step(.5); code('keyup', 'Shift', 'ShiftLeft');
  check(R.events.shots >= 2, 'Shift shoots');
  R.events.shots = 0; R.fireT = 0; code('keydown', "'", 'Quote'); step(.3); code('keyup', "'", 'Quote');
  check(R.events.shots >= 1, "' shoots");
  bull.cd = 0; bull.slash = -1; code('keydown', 'Enter', 'Enter'); update(1 / 60);
  check(bull.slash >= 0, 'Enter slashes');
  bull.cd = 0; bull.slash = -1; code('keydown', 'K', 'KeyK'); update(1 / 60);
  check(bull.slash >= 0, 'K slashes even with Shift held');
  pauseGame(); altBtn.click();
  check(state === 'play' && R.t < .1, 'restart floor from the pause card');
})();
