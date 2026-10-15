// The level-end cards and the pause card (cards.js, cards-plan.md): what they say, Retry's first-time question, the
// run's flag after a retry, Quit to the title, and the touch controls' Ghost states.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const rugged = () => { for (let i = 0; i < 12 && R.phase !== 'dead'; i++) { bull.inv = 0; hurtBull(1, 'test'); } step(4.5); };

  // the stairwell before the katana: back to the garage; the first Retry asks, the next goes straight through
  RUN.force = 3737; startRun('stairs'); step(.5);
  rugged();
  check(state === 'over' && Cards.kind === 'rugged' && Cards.info.who === 'stairs' && Cards.info.back === 'THE GARAGE' && Cards.info.ranked, 'stairwell: rugged, back to the garage, still ranked');
  check(Cards.labels().join() === 'Retry,Quit' && card.hidden, 'Retry and Quit, on the card, not the HTML card');
  Cards.press('Retry');
  check(Cards.confirming && Cards.labels().join() === 'Retry,Back' && state === 'over', 'the first Retry asks');
  Cards.press('Retry');
  check(state === 'play' && !Cards.open && R.continues === 1, 'then retries: the run has retried');
  draw();   // the HUD draws its crossed-out trophy now
  rugged();
  check(Cards.kind === 'rugged' && !Cards.info.ranked, 'rugged again: already off the board');
  Cards.press('Retry');
  check(state === 'play' && R.continues === 2, 'a later Retry goes straight through');

  // Quit: back to the title screen
  rugged();
  Cards.press('Quit');
  check(state === 'title' && cardKind === 'title' && !card.hidden && !Cards.open && cardTitle.textContent === 'The 13th Floor: Accounting', 'Quit goes to the title screen');

  // the pause card: the game's own buttons, Quit to the title
  RUN.force = 3738; startRun('floor48'); step(.5);
  pauseGame();
  check(state === 'pause' && Cards.kind === 'pause' && Cards.info.dept === 'RECLAMATION' && Cards.info.line === floor.pauseText, 'the pause card: the department and the stage\'s line');
  check(Cards.labels()[0] === 'Resume' && Cards.labels().includes('Restart floor') && Cards.labels().includes('Controls') && Cards.labels()[Cards.labels().length - 1] === 'Quit', 'its buttons');
  Cards.press('Quit');
  check(state === 'title' && !Cards.open, 'pause Quit goes to the title screen');

  // a clear: the department, the floor's souls and the run's total, one button
  RUN.force = 3739; startRun('floor13'); R.banked = 12; R.souls = 90; R.phase = 'win'; R.endT = 150; endRun('clear');
  check(Cards.kind === 'clear' && Cards.info.dept === 'ACCOUNTING' && Cards.info.souls === 90 && Cards.info.run === 102 && Cards.info.time === 150, 'clear: souls freed, time, run total');
  check(Cards.labels().join() === 'Continue', 'one button: Continue');

  // the touch controls: the blaster off shows no ring
  const shoot = document.querySelector('.pad.shoot');
  shoot.classList.add('off');
  check(getComputedStyle(shoot, '::before').display === 'none', 'Shoot off: no ring');
  shoot.classList.remove('off');
  check(getComputedStyle(shoot, '::before').display !== 'none', 'Shoot: its ring');
  check(!shoot.textContent.trim() && shoot.getAttribute('aria-label') === 'Shoot', 'no label on the button, its name for screen readers');
  RUN.force = null; newRun(); setState('title'); showCard('title');
})();
