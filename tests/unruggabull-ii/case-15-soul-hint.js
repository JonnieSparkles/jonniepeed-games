// The souls' hint (the mega stream's first glimpse): the first time the blaster comes back in the Shredder's fight, two
// souls leave the counter and fly into the gun, and it fires two then three soul streams for the rest of the fight.
// Nothing announces it, the counter keeps its souls, and the streams cost no extra charges.
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
    check(R.hint && R.hint.landed === T.souls && R.hint.streams === 3, 'three streams once the souls are in');
    check(bells.length === 2 && bells[0] === 0 && bells[1] === 1, 'one bell for each new stream (' + bells.join(',') + ')');
    check(R.souls === souls, 'the counter keeps its souls');
    // firing: the bolt plus two soul streams, side by side and fanning slightly, for one charge
    R.shots = []; R.fireT = 0; const charge = R.charge;
    keys.kbShoot = true; update(1 / 60); keys.kbShoot = false;
    const soul = R.shots.filter(s => s.soul), bolt = R.shots.filter(s => !s.soul);
    check(bolt.length === 1 && soul.length === 2, 'a bolt and two soul streams');
    check(R.charge === charge - 1, 'for one charge');
    check(soul.every(s => Math.abs(s.du) <= .1 && !s.tgt && !s.spread), 'parallel or fanning slightly, never homing in, and not Spread Shot');
    check(soul[0].du * soul[1].du < 0, 'one each side');
    draw();
    // a soul stream does normal blaster damage
    R.shots = soul.slice(0, 1); const hp = b.hp; b.jam = 0;
    for (let i = 0; i < 60 && R.shots.length; i++) { quiet(); update(1 / 60); }
    check(Math.abs((hp - b.hp) - TUNE.shotDmg * .5) < 1e-6, 'a soul stream does normal damage (' + (hp - b.hp) + ')');
    // it stays: still three streams after a long while firing
    const n = bells.length;
    keys.kbShoot = true; step(12); keys.kbShoot = false;
    check(R.hint && R.hint.streams === 3, 'the streams stay with him');
    attack('surge'); quiet();
    check(R.armed === true && R.hint && R.hint.streams === 3, 'with the souls in the gun, a surge breaks on them');
    // knocked out of his hands, they wait; won back, they're there again, with no new souls or bells
    R.armed = false; quiet(); update(1 / 60);
    check(R.hint && R.hint.streams === 3, 'they wait while the blaster is gone');
    R.pickups.push({ kind: 'blaster', w: R.dist + bull.bz, u: bull.u, h: 0, t: 1, still: true, rug: true });
    quiet(); update(1 / 60);
    check(R.armed === true && R.hint && R.hint.streams === 3 && bells.length === n, 'and come back with it, without a sound');
    R.shots = []; R.fireT = 0; keys.kbShoot = true; update(1 / 60); keys.kbShoot = false;
    check(R.shots.filter(s => s.soul).length === 2, 'still a bolt and two streams');
  } finally { Snd.play = play; }
})();
