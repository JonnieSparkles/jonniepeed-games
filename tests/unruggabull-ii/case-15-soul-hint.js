// The souls' hint (the mega stream's first glimpse): the first time the blaster comes back in the Shredder's fight, a
// soul leaves the counter and flies into the gun, and it fires a soul stream beside the bolt for the rest of the fight.
// Nothing announces it, the counter keeps its souls, and the stream costs no extra charges. When the Shredder's beaten,
// the soul says goodbye before the clear. (One soul here, two on the 48th Floor, three on the roof.)
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const bells = [], play = Snd.play;
  Snd.play = function (name, arg) { if (name === 'bell') bells.push(arg); return play.apply(this, arguments); };
  try {
    RUN.force = 1515; startRun(); bull.inv = 1e9; R.beat = 2; R.beatT = BEATS[2].minT; R.souls = TUNE.goal;
    for (let i = 0; i < 60 * 14 && R.phase !== 'boss'; i++) update(1 / 60);
    const b = R.boss;
    R.pull.next = 1e9; b.hp = 30; update(1 / 60);
    check(b.ph === 3, 'phase three');
    b.dark = null; bull.u = 0; bull.bz = 0; bull.jh = 0;
    const quiet = () => { b.atk = 1e9; R.projs = []; R.rows = []; b.rally = null; R.pull.st = 'idle'; R.pull.next = 1e9; };
    for (let i = 0; i < 90 && R.armed !== false; i++) { quiet(); update(1 / 60); }
    check(R.armed === false, 'the surge takes the blaster');
    check(!R.hint, 'no hint while it is gone');
    // bring the blaster to his feet and walk onto it
    const gun = R.pickups.find(pk => pk.kind === 'blaster');
    gun.t = 1; gun.w = R.dist + bull.bz; gun.u = bull.u; quiet(); R.banner = null; R.talk = null;
    const souls = R.souls; update(1 / 60);
    check(R.armed === true && R.hint, 'he gets it back, and the souls come');
    check(!R.banner && !R.fx.some(f => f.k === 'big'), 'nothing announces it');
    check(liveEl.textContent === 'Blaster back.', 'the live line stays neutral (' + liveEl.textContent + ')');
    // the souls fly into the gun; the first two each add a stream with one bell
    const T = TUNE.soulHint;
    let most = 1, drew = false;
    for (let i = 0; i < 60 * (T.wait + T.gap * T.souls + T.fly + .2); i++) { quiet(); update(1 / 60); most = Math.max(most, R.hint ? R.hint.streams : 1); if (!drew && R.hint && R.hint.t > T.fly * .5) { draw(); drew = true; } }
    check(R.hint && R.hint.landed === T.souls && R.hint.streams === 2, 'two streams (the bolt and the soul\'s) once the soul is in');
    check(bells.length === 1 && bells[0] === 0, 'one bell for the new stream (' + bells.join(',') + ')');
    check(R.souls === souls, 'the counter keeps its souls');
    // firing: the bolt plus a soul stream flying straight beside it, for one charge
    R.shots = []; R.fireT = 0; const charge = R.charge;
    keys.kbShoot = true; update(1 / 60); keys.kbShoot = false;
    const soul = R.shots.filter(s => s.soul), bolt = R.shots.filter(s => !s.soul);
    check(bolt.length === 1 && soul.length === 1, 'a bolt and a soul stream');
    check(R.charge === charge - 1, 'for one charge');
    check(soul.every(s => s.du === 0 && !s.tgt && !s.spread), 'parallel, never homing in, and not Spread Shot');
    check(soul[0].side === 1, 'beside the bolt');
    draw();
    // a soul stream does normal blaster damage
    R.shots = soul.slice(0, 1); const hp = b.hp; b.jam = 0;
    for (let i = 0; i < 60 && R.shots.length; i++) { quiet(); update(1 / 60); }
    check(Math.abs((hp - b.hp) - TUNE.shotDmg * .5) < 1e-6, 'a soul stream does normal damage (' + (hp - b.hp) + ')');
    // it stays: still three streams after a long while firing
    const n = bells.length;
    keys.kbShoot = true; step(12); keys.kbShoot = false;
    check(R.hint && R.hint.streams === 2, 'the stream stays with him');
    attack('surge'); quiet();
    check(R.armed === true && R.hint && R.hint.streams === 2, 'with the soul in the gun, a surge breaks on it');
    // knocked out of his hands, they wait; won back, they're there again, with no new souls or bells
    R.armed = false; quiet(); update(1 / 60);
    check(R.hint && R.hint.streams === 2, 'it waits while the blaster is gone');
    R.pickups.push({ kind: 'blaster', w: R.dist + bull.bz, u: bull.u, h: 0, t: 1, still: true, rug: true });
    quiet(); update(1 / 60);
    check(R.armed === true && R.hint && R.hint.streams === 2 && bells.length === n, 'and comes back with it, without a sound');
    R.shots = []; R.fireT = 0; keys.kbShoot = true; update(1 / 60); keys.kbShoot = false;
    check(R.shots.filter(s => s.soul).length === 1, 'still a bolt and a stream');
    draw();
    // goodbye: once it's beaten (after its last line) the souls leave the gun, salute, say good luck and rise with the
    // rest; the clear waits for them
    const Y = TUNE.soulBye; bells.length = 0; R.shots = []; R.projs = [];
    bossDamage(b.hp, 'deflect');
    check(R.phase === 'win' && R.hint && R.hint.streams === 2, 'beaten, with the soul still in the gun');
    let saw = false, rose = 0;
    for (let i = 0; i < 60 * 30 && R.phase === 'win' && state !== 'over'; i++) {
      update(1 / 60);
      if (R.hint && R.hint.bye && !saw) { saw = true; check(R.hint.streams === 1, 'they leave the gun'); }
      if (R.hint && R.hint.bye && R.hint.bye.t > Y.say + .2 && R.hint.bye.t < Y.say + .3) { draw(); check(!R.events.clearBanner, 'the clear waits while they say goodbye'); }
      rose = Math.max(rose, R.fx.filter(f => f.k === 'rise').length);
    }
    check(saw && bells.length === 2, 'goodbye, with a bell as they come out and one as they speak (' + bells + ')');
    check(rose === Math.min(40, R.souls), 'and the floor\'s souls rise with them');
    check(state === 'over' && cardTitle.textContent === 'The 13th Floor clear', 'then the clear card');
  } finally { Snd.play = play; }
})();
