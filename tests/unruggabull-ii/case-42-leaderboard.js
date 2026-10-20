// The online board (README, Leaderboard; claude's leaderboard plan): only a finished run gets a token and an offer (the
// roof cleared, from Start, never retried); the run clock and the run's meta; the clear card's step (checking, the offer
// in and below the top 50, the picker and its keys, saved, skipped, refused initials, a refused save, offline); the
// rugged and retried lines; #stage, Restart floor and the 13th's clear never offering; the title's board (TOP 10 / TOP
// 50, your best at its real rank under a gap, offline with the device's board). Leaderboard is stubbed: no network.
(async function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const LB = window.Leaderboard, saved = Object.assign({}, LB), pn = performance.now.bind(performance);
  let add = 0;
  performance.now = () => pn() + add;
  const wait = s => { add += s * 1000; Cards.frame(); };
  const settle = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };
  const calls = { start: [], load: [], submit: [] };
  let loadAnswer = null, submitAnswer = null;
  const row = (rank, name, score, time, hat, input) => ({ rank, name, score, input: input || 'touch', meta: { time_ms: time, hat: hat || 0 } });
  const TOP = [row(1, 'JON', 744, 650000, 2), row(2, 'ZAP', 700, 520000), row(3, 'MOO', 690, 530000, 1, 'keys'), row(4, 'KAT', 680, 540000), row(5, 'RUG', 670, 550000)];
  LB.start = (game, board) => { calls.start.push([game, board]); return Promise.resolve('tok-' + board); };
  LB.load = (game, board, score, meta) => { calls.load.push([game, board, score, meta]); return Promise.resolve(typeof loadAnswer === 'function' ? loadAnswer(score, meta) : loadAnswer); };
  LB.submit = data => { calls.submit.push(data); return Promise.resolve(typeof submitAnswer === 'function' ? submitAnswer(data) : submitAnswer); };
  LB.initials = () => 'JON';
  let initialsSaved = null; LB.saveInitials = s => { initialsSaved = s; };
  const step = () => { for (let i = 0; i < 30; i++) update(1 / 60); };
  const rugged = () => { for (let i = 0; i < 12 && R.phase !== 'dead'; i++) { bull.inv = 0; hurtBull(1, 'test'); } for (let i = 0; i < 300 && state === 'play'; i++) update(1 / 60); };
  const tp = label => { Title.frame(); Title.press(label); Title.frame(); };   // the title's buttons follow its frame
  const mineKey = b => 'unruggabull-ii-mine-' + b;
  for (let b = 1; b <= 4; b++) localStorage.removeItem(mineKey(b));
  try {
    // ---- tokens: Start's run gets one for its mode's board; Restart floor and #stage runs never ask ----
    setMode('raging'); startRun('stairs', true);
    check(calls.start.length === 1 && calls.start[0][0] === 'unruggabull-ii' && calls.start[0][1] === 3 && RUN.full && RUN.input === 'keys', 'a full run asks for a token on its mode\'s board (Raging is 3)');
    setMode('regular'); startRun('stairs');
    check(calls.start.length === 1 && RUN.lb === null && !RUN.full, 'Restart floor and #stage runs never ask for a token');
    // the board's input icon: touch once a finger plays, not before
    setMode('baby'); startRun('stairs', true);
    check(calls.start[1][1] === 1 && RUN.input === 'keys', 'Baby is board 1');
    document.getElementById('pads').dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
    check(RUN.input === 'touch', 'a touch on the controls in play makes it a touch run');

    // ---- the run clock: every stage's game time, carried by travel(); the roof's stops where the ending starts ----
    setMode('regular'); startRun('stairs', true);
    R.t = 41.5; travel('floor13'); check(RUN.clock === 41.5, 'the stairwell\'s time carried');
    R.t = 150; travel('elevator'); check(RUN.clock === 191.5, 'the 13th\'s added');
    const clock0 = RUN.clock; step();
    check(RUN.clock === clock0, 'the clock only moves at a stage change');
    RUN.clock = 400; travel('roof');
    check(RUN.clock > 400, 'the ride added');

    // ---- the roof cleared: CHECKING THE BOARD..., then the offer (top 50) ----
    RUN.clock = 400; R.souls = 702; R.banked = 0; R.endT = 140; R.t = 170; R.phase = 'win';
    loadAnswer = (score) => ({ ok: true, scores: TOP, placement: 2, position: 2, total: 1204 });
    endRun('clear');
    check(Cards.kind === 'clear' && Cards.info.lb.kind === 'save' && Cards.step === 'check' && Cards.labels().length === 0, 'the clear checks the board first, with no buttons yet');
    await settle();
    const ld = calls.load[calls.load.length - 1];
    check(ld[1] === 2 && ld[2] === 702 && ld[3].time_ms === 540000 && ld[3].hat === 0, 'it looks up the run: souls, the run clock (400 + 140 s, not the ending), no hat');
    wait(1); check(Cards.step === 'check', 'checking stays a beat');
    wait(1.5); check(Cards.step === 'offer', 'then the offer');
    check(Cards.stepLines.join('|') === 'NEW HIGH SCORE. 2ND.|SUBMIT INITIALS FOR PROCESSING.', 'in the top 50: NEW HIGH SCORE. 2ND.');
    check(Cards.labels().join() === 'Enter initials,Skip', 'Enter initials and Skip, the card\'s own button waits');
    // the picker: the last initials used, letters and digits typed, the arrows cycle, Backspace goes back
    Cards.press('Enter initials');
    check(Cards.step === 'pick' && Cards.initials === 'JON' && Cards.labels().slice(-2).join() === 'OK,Skip', 'the picker starts from the last initials, with OK and Skip');
    const key = k => Cards.key({ key: k, repeat: false });
    check(key('b') && Cards.initials === 'BON' && Cards.slot === 1, 'a letter fills the slot and moves on');
    key('7'); key('ArrowUp'); check(Cards.initials === 'B7O' && Cards.slot === 2, 'a digit, then up cycles the slot you\'re on');
    key('Backspace'); key('ArrowDown'); check(Cards.initials === 'B6O' && Cards.slot === 1, 'Backspace goes back a slot, down cycles');
    check(key('m') && Cards.initials === 'BMO' && !key('Tab'), 'M is a letter here, not the game\'s sound key; Tab passes');
    // refused initials keep the picker open
    submitAnswer = { ok: false, error: 'name_not_allowed' };
    Cards.press('OK'); check(Cards.step === 'busy' && Cards.stepLines[0] === 'PROCESSING...', 'OK: processing');
    await settle();
    check(Cards.step === 'pick' && Cards.stepLines[0] === 'TRY OTHER INITIALS.', 'blocked initials: try other initials, the picker stays');
    const sub = calls.submit[0];
    check(sub.game === 'unruggabull-ii' && sub.board === 2 && sub.token === 'tok-2' && sub.name === 'BMO' && sub.score === 702 && sub.meta.time_ms === 540000 && sub.meta.hat === 0 && sub.input === 'keys', 'the save carries the token, initials, souls, the run clock and the input');
    // saved
    submitAnswer = d => ({ ok: true, rank: 2, position: 2, total: 1205, scores: [TOP[0], row(2, d.name, d.score, d.meta.time_ms)].concat(TOP.slice(1)) });
    key('Enter'); await settle();
    check(Cards.step === 'saved' && Cards.stepLines[0] === 'PROCESSED. 2ND OF 1,205.' && initialsSaved === 'BMO', 'saved: PROCESSED. 2ND OF 1,205., the initials kept');
    wait(.5); check(Cards.labels().join() === 'Continue', 'then the card\'s own button');
    const mine = JSON.parse(localStorage.getItem(mineKey(2)));
    check(mine.name === 'BMO' && mine.score === 702 && mine.meta.time_ms === 540000, 'your best is kept on the device for the title');
    Cards.hide();

    // below the top 50, skipped
    startRun('roof', true); RUN.clock = 300; R.souls = 401; R.endT = 150; R.phase = 'win';
    loadAnswer = { ok: true, scores: TOP, placement: null, position: 312, total: 1204 };
    endRun('clear'); await settle(); wait(2.5);
    check(Cards.stepLines[0] === "YOU'D BE 312TH OF 1,204.", 'below the top 50: YOU\'D BE 312TH OF 1,204.');
    check(Cards.key({ key: 'Escape' }) && Cards.step === 'skipped' && Cards.stepLines[0] === 'UNPROCESSED. IT WOULD BE 312TH.', 'Escape skips: UNPROCESSED. IT WOULD BE 312TH.');
    const before = calls.submit.length; wait(.5);
    check(Cards.labels().join() === 'Continue' && calls.submit.length === before, 'skipping saves nothing');
    Cards.hide();
    // a refused save: the board without the row, and it says so
    startRun('roof', true); R.souls = 401; R.endT = 150; R.phase = 'win';
    endRun('clear'); await settle(); wait(2.5); Cards.press('Enter initials');
    submitAnswer = null; Cards.press('OK'); await settle();
    check(Cards.step === 'skipped' && Cards.stepLines[0] === 'PROCESSING FAILED. UNPROCESSED.', 'a refused or failed save: PROCESSING FAILED. UNPROCESSED.');
    Cards.hide();
    // no token (the Worker was down when the run began): offline, never an offer
    LB.start = () => Promise.resolve(null);
    const loads = calls.load.length;
    startRun('roof', true); R.souls = 401; R.endT = 150; R.phase = 'win';
    endRun('clear'); await settle(); await settle(); wait(2.5);
    check(Cards.step === 'off' && Cards.stepLines.join(' ') === 'BOARD OFFLINE. UNPROCESSED.' && calls.load.length === loads, 'no token: BOARD OFFLINE., no lookup');
    wait(.5); check(Cards.labels().join() === 'Continue', 'and Continue');
    Cards.press('Continue'); Title.frame();
    check(state === 'title' && Title.board, 'a full run\'s Continue opens the title on its mode\'s board (owner, Oct 17)');
    await settle(); for (const k in online) delete online[k];   // the title's board asks again later, with its own answer
    Cards.hide();
    // a token from a retry (the Worker down when the run began, back mid-run): it saves, timed from the token
    let tries = 0;
    LB.start = () => { tries++; return Promise.resolve(tries === 1 ? null : 'tok-late'); };
    LB.retryWaits = [5];
    startRun('roof', true); RUN.clock = 100; R.t = 20; R.endT = 0;
    await new Promise(r => setTimeout(r, 80)); await settle();
    check(tries === 2 && RUN.lb.token === 'tok-late' && RUN.lb.from === 120000, 'a failed token request is asked again; the token counts from 120 s in');
    RUN.clock = 300; R.souls = 401; R.endT = 150; R.phase = 'win';
    loadAnswer = { ok: true, scores: TOP, placement: null, position: 312, total: 1204 };
    endRun('clear'); await settle(); await settle(); wait(2.5);
    check(Cards.step === 'offer' && calls.load[calls.load.length - 1][3].time_ms === 330000, 'it offers, with the run\'s time from the token (450 s less 120 s)');
    check(Cards.info.lb.played === 450 && Cards.info.lb.time === 330, 'the card\'s TOTAL shows the run\'s real time; the save, the time from the token');
    Cards.press('Enter initials'); submitAnswer = d => ({ ok: true, rank: null, position: 312, total: 1205, scores: TOP });
    Cards.press('OK'); await settle();
    const lateSave = calls.submit[calls.submit.length - 1];
    check(lateSave.token === 'tok-late' && lateSave.meta.time_ms === 330000 && Cards.step === 'saved', 'and saves with the late token');
    await new Promise(r => setTimeout(r, 40));
    check(tries === 2, 'no more asking once the run has its token');
    Cards.hide();
    LB.start = () => Promise.resolve(null);   // the cards below run without a token, as before
    // the clear's lines about the run (owner, Oct 17): the hat it missed and why, and Impossibull the first time it opens
    const opened = localStorage.getItem('unruggabull-ii-impossibull'), mode0 = RUN.mode; setMode('raging'); localStorage.setItem('unruggabull-ii-impossibull', '1');
    startRun('roof', true); R.souls = 401; R.endT = 150; R.phase = 'win'; RUN.hatMiss = { kind: 'crown', why: 'hurt', hearts: 3 };
    endRun('clear');
    check(Cards.runLines.join() === 'NO CROWN. NEEDS FULL HEALTH AT THE TOP.', 'a missed hat: why, on the clear card');
    Cards.hide(); localStorage.removeItem('unruggabull-ii-impossibull');
    startRun('roof', true); R.souls = 401; R.endT = 150; R.phase = 'win'; RUN.hatMiss = { kind: 'crown', why: 'retried', hearts: 5 };
    endRun('clear');
    check(Cards.runLines.join() === 'IMPOSSIBULL UNLOCKED.,NO CROWN. NEEDS NO RETRIES.', 'a clean Raging clear opens Impossibull and says so');
    Cards.hide();
    startRun('roof', true); R.souls = 401; R.endT = 150; R.phase = 'win'; RUN.hatMiss = null; endRun('clear');
    check(Cards.runLines.length === 0, 'only the first time; and nothing when the hat came');
    Cards.hide(); startRun('roof'); RUN.hatMiss = { kind: 'cap', why: 'hurt', hearts: 3 }; R.phase = 'win'; endRun('clear');
    check(Cards.runLines.length === 0, 'and nothing for a practice run');
    Cards.hide();
    if (opened === null) localStorage.removeItem('unruggabull-ii-impossibull'); else localStorage.setItem('unruggabull-ii-impossibull', opened);
    setMode(mode0);
    LB.start = (game, board) => { calls.start.push([game, board]); return Promise.resolve('tok-' + board); };

    // ---- runs that never post ----
    startRun('roof', true); R.continues = 1; R.souls = 401; R.endT = 150; R.phase = 'win';
    endRun('clear');
    check(Cards.info.lb.kind === 'retried' && !Cards.step && Cards.labels().join() === 'Continue', 'a retried clear: OFF THE RECORD., no offer');
    startRun('floor48', true); rugged();
    check(Cards.kind === 'rugged' && Cards.info.lb.kind === 'rugged', 'rugged: ONLY COMPLETED UNITS ARE PROCESSED.');
    Cards.press('Retry'); Cards.press('Retry'); rugged();
    check(Cards.info.lb.kind === 'retried', 'rugged after a retry: OFF THE RECORD.');
    startRun('roof'); R.souls = 401; R.endT = 150; R.phase = 'win'; endRun('clear');
    check(Cards.info.lb === null && Cards.labels().join() === 'Continue', 'a #stage or Restart floor clear: no step at all');
    startRun('floor13', true); R.souls = 90; R.phase = 'win'; R.endT = 150; endRun('clear');
    check(Cards.info.lb === null, 'the 13th\'s clear: not the end of the run');
    Cards.hide();

    // ---- the title's board ----
    loadAnswer = { ok: true, scores: Array.from({ length: 50 }, (_, i) => row(i + 1, 'R' + String(i).padStart(2, '0'), 800 - i, 600000)), placement: null, position: 313, total: 1205 };
    newRun(); setState('title'); showCard('title'); await settle(); await settle();
    // your best (BMO, saved above on Regular's board) isn't in the top 50: under the gap at its real rank
    check(calls.load[calls.load.length - 1][2] === 702, 'the title asks where your best stands');
    tp('Top runs');
    const l10 = Title.list();
    check(l10.length === 10 && l10[7] === '8 R07' && l10[8] === '...' && l10[9] === '312 BMO YOU', 'top 10: eight rows, the gap, your best at 312 (it lost its tie with itself)');
    tp('Top 50');
    const l50 = Title.list();
    check(l50.length === 52 && l50[49] === '50 R49' && l50[50] === '...' && l50[51] === '312 BMO YOU', 'top 50: all fifty, the gap, yours');
    tp('Top 10'); tp('Back');
    // yours among them: highlighted in place
    loadAnswer = { ok: true, scores: [TOP[0], row(2, 'BMO', 702, 540000, 0, 'keys'), row(3, 'ZAP', 700, 520000)], placement: 3, position: 3, total: 3 };
    showCard('title'); await settle(); await settle(); tp('Top runs');
    check(Title.list().join() === '1 JON,2 BMO YOU,3 ZAP', 'yours in the top 10: in place, highlighted');
    tp('Back');
    // offline: BOARD OFFLINE and the device's board standing in
    loadAnswer = null;
    localStorage.setItem('unruggabull-ii-board-regular', JSON.stringify([['CLEAR', 702], ['48TH', 300]]));
    showCard('title'); await settle(); await settle(); tp('Top runs');
    check(Title.list().join() === 'BOARD OFFLINE,1 CLEAR,2 48TH' && Title.labels().includes('Top 50') && Title.labels().includes('Back'), 'offline: BOARD OFFLINE, the device\'s board, the buttons kept');
    tp('Back');
    localStorage.removeItem('unruggabull-ii-board-regular');
  } finally {
    Object.assign(LB, saved); performance.now = pn;
    for (let b = 1; b <= 4; b++) localStorage.removeItem(mineKey(b));
    RUN.force = null; setMode('regular'); newRun(); setState('title'); showCard('title');
  }
})();
