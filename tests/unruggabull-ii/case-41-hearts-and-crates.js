// Hearts across the climb and the long ride's crate per mode (item 30): hearts carry across every stage change on every
// mode; on Baby and Regular the first-aid box on the stairwell's top landing, the quiet ride's crate and the long ride's
// crate each fill them, and nothing else between stages does; the long ride's top on each mode (the cap, the crown, the
// halo); walking out takes an untaken crate; the hat worn through the roof and the ending, and on the board.
(function () {
  const check = (ok, why) => { if (!ok) throw new Error(why); };
  const tick = s => { for (let i = 0; i < Math.ceil(s * 60); i++) update(1 / 60); };
  const E = floors.elevator, T = E.T, EL = E.ELEVATOR, events = [];
  const quiet = { fight: false, from: 13, destination: { floor: 48, label: '48', stage: 'floor48' } };
  const ride = (mode, o) => {
    setMode(mode); travelHook = null; checkpoint = null; RUN.force = 42; RUN.hat = null; events.length = 0;
    newRun(Object.assign({ stage: 'elevator', transfer: true, souls: 10, from: 48, fight: true }, o));
    RUN.force = null; setState('play'); card.hidden = true; clearHeld(); input.jump = input.slash = input.shoot = 0;
    emitHook = (type, data) => events.push({ type, data, t: R.elevator ? R.elevator.t : -1 });
  };
  const at = t => { while (R.elevator.t < t && R.phase !== 'win' && R.stage === 'elevator') { bull.inv = 1e9; update(1 / 60); } };
  const lines = () => { const out = []; let last = null; return { step() { if (R.talk && R.talk !== last) { last = R.talk; out.push(R.talk.speaker + ': ' + R.talk.text); } }, out }; };
  // the long ride from the crate's time to the doors behind him, him standing in the doorway, with the hearts given
  const top = (mode, hearts, continues) => {
    ride(mode, { hearts, continues: continues || 0 }); at(T.arrive + .1); R.hearts = hearts; bull.u = 0; bull.inv = 1e9;
    const said = lines(); const souls0 = R.souls;
    while (R.stage === 'elevator') { bull.inv = 1e9; update(1 / 60); said.step(); }
    return { said: said.out, souls: R.souls - souls0, hearts: R.hearts, hat: RUN.hat, ev: events.slice() };
  };
  const supply = r => (r.ev.find(e => e.type === 'elevator_supply') || { data: {} }).data.item;
  try {
    // ---- hearts carry across every stage change, on every mode ----
    for (const mode of ['baby', 'regular', 'raging', 'impossibull']) {
      setMode(mode); RUN.force = 4101; startRun('floor13'); R.hearts = 3;
      travel('elevator', RIDE_TO_48); check(R.hearts === 3, mode + ': into the quiet ride with the hearts he had');
      R.hearts = 2; travel('floor48'); check(R.hearts === 2, mode + ': into the 48th');
      R.hearts = 3; travel('elevator', { fight: true, from: 48 }); check(R.hearts === 3, mode + ': into the long ride');
      R.hearts = 2; travel('roof', { ride: { floor: 99, label: 'R', stage: 'roof' } }); check(R.hearts === 2, mode + ': onto the roof');
    }
    check(!('refillBetweenStages' in RUN), 'no automatic refill between stages anywhere');

    // ---- the first-aid box on the stairwell's top landing ----
    const toTop = (mode, x) => {
      setMode(mode); RUN.force = 4102; newRun({ stage: 'stairs', section: 2, katana: true, souls: 0 }); setState('play'); card.hidden = true;
      emitHook = (type, data) => events.push({ type, data }); events.length = 0;
      const S = R.stairs; S.script = 1e9; R.arena.enemies = []; R.hearts = 2; bull.inv = 1e9;
      if (x != null) bull.u = (x / 2 - 120) / floors.stairs.arena.ARENA.width;
      tick(1 / 60); return S;
    };
    for (const mode of ['baby', 'regular']) {
      const S = toTop(mode, 260);
      check(S.exitOpen && S.box && !S.box.got && S.box.x === 340, mode + ': the box turns up on the landing, ahead of him, once the last flights are cleared');
      check(R.hearts === 2, mode + ': it waits to be taken');
      keys.kbRight = true; let n = 0; while (!S.box.got && n++ < 120) update(1 / 60); keys.kbRight = false;
      check(S.box.got && R.hearts === 5 && events.some(e => e.type === 'pickup' && e.data.item === 'firstaid'), mode + ': walking into it fills his hearts');
      check(R.fx.some(f => f.k === 'pop' && f.text === 'FULL HEARTS'), mode + ': with a FULL HEARTS pop, as a coffee says +1 HEART');
      // already past it: it turns up where he'll stop at the door, and the walk to the door takes it
      const S2 = toTop(mode, 420);
      check(S2.box && S2.box.x === floors.stairs.STAIRS.door.stand, mode + ': past the spot, it turns up at the door');
      tick(.8); check(S2.st === 'door' && S2.box.got && R.hearts === 5, mode + ': the walk to the door takes it');
      R.hearts = 5; const S3 = toTop(mode, 260); R.hearts = 5; keys.kbRight = true; let m = 0; while (!S3.box.got && m++ < 120) update(1 / 60); keys.kbRight = false;
      check(R.fx.some(f => f.k === 'pop' && f.text === 'FULL'), mode + ': at full hearts it says FULL, as the coffee does');
    }
    for (const mode of ['raging', 'impossibull']) {
      const S = toTop(mode, 260); tick(1);
      check(S.exitOpen && !S.box && R.hearts === 2, mode + ': no box at all');
    }

    // ---- the quiet ride's crate, and its last line ----
    const quietRide = (mode, hearts) => {
      ride(mode, Object.assign({ hearts }, quiet)); const said = lines(); bull.u = 0;
      let left = null;
      while (R.stage === 'elevator') { bull.inv = 1e9; update(1 / 60); said.step(); if (R.stage === 'elevator' && R.arena.out > 0 && left == null) left = R.elevator.t; }
      return { said: said.out, hearts: R.hearts, left, ev: events.slice() };
    };
    for (const mode of ['baby', 'regular']) {
      const q = quietRide(mode, 2);
      check(q.said.slice(-3).join() === "operator: RECLAMATION, SIR.,bull: KEEP THE SLIP.,operator: YOU'RE GOING TO NEED THIS.", mode + ': the new line comes last: ' + q.said.join(' / '));
      check(q.hearts === 5 && q.ev.some(e => e.type === 'elevator_crate' && e.data.ride === 'quiet'), mode + ': the quiet ride\'s crate fills his hearts');
      const p = E.top(), last = p.doors + EL.last.at + EL.last.dur;
      check(q.left >= last - .02, mode + ': the exit gate moves with the new line');
      const f = quietRide(mode, 5);
      check(f.hearts === 5 && f.said[f.said.length - 1] === 'operator: YOU GOT THIS.' && !f.ev.some(e => e.type === 'elevator_crate'), mode + ': arriving at full hearts, no crate: "YOU GOT THIS."');
      check(f.left >= last - .02, mode + ': the same exit gate either way');
    }
    for (const mode of ['raging', 'impossibull']) {
      const q = quietRide(mode, 2);
      check(q.said[q.said.length - 1] === 'operator: YOU GOT THIS.' && q.hearts === 2 && !q.ev.some(e => e.type === 'elevator_crate'), mode + ': no crate; "YOU GOT THIS."');
    }

    // ---- the long ride's top, per mode ----
    let r = top('baby', 3);
    check(supply(r) === 'hearts' && r.hearts === 5 && r.souls === 0 && !r.hat, 'Baby, hurt: the crate fills his hearts ' + JSON.stringify([supply(r), r.hearts, r.souls, r.hat, r.said, r.ev.map(e => e.type)]));
    r = top('baby', 5);
    check(supply(r) === 'souls' && r.souls === EL.crateSouls && !r.hat, 'Baby, full: 20 souls, nothing to wear');
    r = top('regular', 3);
    check(supply(r) === 'hearts' && r.hearts === 5 && r.souls === 0 && !r.hat, 'Regular, hurt: the crate fills his hearts, no cap');
    r = top('regular', 5);
    check(supply(r) === 'none' && r.souls === EL.hatSouls.cap && r.hat === 'cap' && r.said.includes('operator: ON THE HOUSE.'), 'Regular, full, no continues: nothing from the crate, and the cap');
    check(r.said.slice(-2).join() === 'operator: FLOOR?,bull: ROOF.', 'then FLOOR? and ROOF.');
    check(r.ev.findIndex(e => e.type === 'elevator_hat') < r.ev.findIndex(e => e.type === 'elevator_exit'), 'the cap lands before he walks out');
    r = top('regular', 5, 1);
    check(supply(r) === 'none' && !r.hat, 'Regular, full but continued: no cap');
    r = top('raging', 5);
    check(supply(r) === 'poof' && r.hat === 'crown' && r.souls === EL.hatSouls.crown && r.hearts === 5, 'Raging, full, no continues: the heart poofs, then the crown and its souls');
    r = top('raging', 3);
    check(supply(r) === 'poof' && !r.hat && r.hearts === 3 && r.souls === 0 && r.said.includes('operator: YOU CHOSE THIS DIFFICULTY.'), 'Raging, hurt: the heart poofs, no hearts, no souls, and his line');
    r = top('raging', 5, 1);
    check(!r.hat && r.said.includes('operator: YOU CHOSE THIS DIFFICULTY.'), 'Raging, continued: no crown');
    r = top('impossibull', 5);
    check(!r.ev.some(e => e.type === 'elevator_crate') && r.hat === 'halo' && r.souls === EL.hatSouls.halo, 'Impossibull, never hit: no crate, and the halo');
    r = top('impossibull', 4);
    check(!r.ev.some(e => e.type === 'elevator_crate') && !r.hat && r.hearts === 4 && r.said.includes('operator: THERE IS NO CRATE.'), 'Impossibull, hit: no crate, "THERE IS NO CRATE."');
    check(top('impossibull', 5, 1).hat === null, 'Impossibull, continued: no halo');
    check(!top('regular', 3).said.some(s => /FULL HEARTS|SOULS/.test(s)), 'no pop words on the rides');

    // ---- walking out takes a crate he left ----
    ride('regular', Object.assign({ hearts: 2 }, quiet)); bull.u = 0;
    at(E.top().doors + EL.last.at + .05); const qc = R.elevator.crate; qc.u = .9;   // pretend it's still on its way
    bull.u = .9 - .2; R.hearts = 2; at(R.elevator.exitAt + .02); bull.u = 0; qc.u = .9; qc.got = false; tick(1 / 60);
    check(qc.got && R.hearts === 5 && R.arena.out > 0, 'the quiet ride: walking out takes the crate');
    ride('baby', { hearts: 5 }); at(T.arrive - .2); bull.u = 0; while (R.elevator.exitAt === Infinity) { bull.inv = 1e9; update(1 / 60); }
    at(R.elevator.exitAt - .05); R.elevator.crate = { u: .9, got: false, kind: 'long' }; R.hearts = 4;
    for (let i = 0; i < 300 && !(R.arena.out > 0); i++) update(1 / 60);   // to the roof he holds a beat after the last word (roof art, Oct 16)
    check(R.elevator.crate.got && R.hearts === 5, 'the long ride: walking out takes the crate too');

    // ---- the hat: worn on the roof and in the ending, gone on the next run; on the board ----
    const drawn = []; const drawOn = UnrugHats.drawOn; UnrugHats.drawOn = (g, kind, view, rows, t) => { drawn.push(kind + ':' + view); drawOn(g, kind, view, rows, t); };
    try {
      top('regular', 5); check(R.stage === 'roof' && RUN.hat === 'cap', 'the cap goes onto the roof with him');
      drawn.length = 0; draw(); check(drawn.includes('cap:back'), 'on the roof, from behind');
      R.roof.broken = 3; R.roof.round = 3; floors.roof.enter('dawn'); tick(floors.roof.ROOF.time.dawn + .05);
      const En = floors.roof.ending; let n = 0; drawn.length = 0;
      while (En.at() && En.at().i < 5 && n++ < 3000) { update(1 / 60); if (En.at() && En.at().i === 4 && n % 20 === 0) draw(); }
      check(drawn.includes('cap:front'), 'and in the ending, facing us');
      ride('raging', { hearts: 5 }); at(T.arrive - .2); bull.u = 0; R.hearts = 5;
      while (!RUN.hat) { bull.inv = 1e9; update(1 / 60); }
      drawn.length = 0; draw(); check(drawn.includes('crown:side'), 'side on in the ride, once it lands');
    } finally { UnrugHats.drawOn = drawOn; }
    // a hat on the board row, and none for a continued run
    const BK = 'unruggabull-ii-board-regular', saved = localStorage.getItem(BK);
    try {
      localStorage.removeItem(BK);
      setMode('regular'); RUN.force = 4103; startRun('roof', true); RUN.hat = 'cap'; R.souls = 200; R.phase = 'win'; R.endT = 1; endRun('clear');
      check(boardOf('regular')[0][2] === 1, 'a run that won its hat stores it on its board row');
      startRun('roof', true); check(RUN.hat === null, 'a new run starts with no hat');
      R.souls = 100; R.phase = 'win'; R.endT = 1; endRun('clear');
      check(boardOf('regular')[1][2] === 0, 'a run without one stores 0');
      const hats = []; const board = UnrugHats.board; UnrugHats.board = (...a) => { hats.push(a[1]); board(...a); };
      try { setState('title'); Title.show(); Title.press('Top runs'); Title.frame(); } finally { UnrugHats.board = board; }
      check(hats.length && hats.every(k => k === 'cap'), "the title's board draws the cap over that row: " + hats.join());
    } finally { if (saved == null) localStorage.removeItem(BK); else localStorage.setItem(BK, saved); setMode('regular'); }
    emitHook = null;
  } finally { emitHook = null; setMode('regular'); RUN.hat = null; }
})();
