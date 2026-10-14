// The souls' hint (the mega stream's first glimpse) and the finish: the paper that takes the Shredder to its last stand
// stuns it; one soul leaves the counter, pulls the blaster out of its teeth and brings it back to him charged, with
// one bell (D5), and fires one soul stream beside the bolt from then on; then a window to finish it with the blaster.
// The counter keeps its soul, and the stream costs no extra charge. When the Shredder's beaten, the soul says goodbye
// before the clear. (Two on the 48th Floor, three on the roof.)
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const bells = [], play = Snd.play; let streamed = 0;
  Snd.play = function (name, arg) { if (name === 'bell') bells.push(arg); if (name === 'hintStream') streamed++; return play.apply(this, arguments); };
  try {
    RUN.force = 1515; startRun(); bull.inv = 1e9; R.beat = 2; R.beatT = BEATS[2].minT; R.souls = TUNE.goal;
    for (let i = 0; i < 60 * 14 && R.phase !== 'boss'; i++) update(1 / 60);
    const b = R.boss;
    R.pull.next = 1e9; b.hp = 30; update(1 / 60);
    check(b.ph === 3, 'phase three');
    b.dark = null; bull.u = 0; bull.bz = 0; bull.jh = 0;
    const quiet = () => { b.atk = 1e9; R.projs = []; R.rows = []; b.rally = null; R.pull.st = 'idle'; R.pull.next = 1e9; };
    for (let i = 0; i < 90 && R.armed !== false; i++) { quiet(); update(1 / 60); }
    check(R.armed === false && b.gun, 'the surge takes the blaster into its mouth');
    check(!R.hint, 'no soul yet');
    // the paper that takes it to its last stand stuns it, and the soul goes for the blaster
    quiet(); R.banner = null; R.talk = null; b.hp = TUNE.lastStand + 3;
    const souls = R.souls; bossDamage(5, 'deflect');
    check(b.hp === TUNE.lastStand && b.final && b.final.st === 'fetch' && b.jam > 0 && R.hint && R.hint.fetch, 'its last stand: stunned, and the soul sets off');
    check(R.banner && R.banner.text === "THE SOUL'S GETTING IT", 'a prompt says what the pause is');
    const T = TUNE.soulHint;
    let drew = 0;
    for (let i = 0; i < 60 * (T.wait + T.fetch + .4) && !R.hint.got; i++) { quiet(); update(1 / 60); if (!drew && R.hint.t > T.fetch * .5) { draw(); drew++; } }
    check(R.hint.got && !b.gun && R.armed === false && !bells.length, 'it pulls the blaster out of its teeth');
    for (let i = 0; i < 60 * (T.fly + .4) && R.hint.landed < 1; i++) { quiet(); update(1 / 60); if (drew < 2 && R.hint.t > T.fetch + T.fly * .5) { draw(); drew++; } }
    check(R.armed === true && R.charge === TUNE.charges && R.hint.landed === 1 && R.hint.streams === 2, 'and brings it back to him charged, and stays in it: one stream');
    check(bells.length === 1 && bells[0] === 0, 'one bell, D5 (' + bells.join(',') + ')');
    check(b.final.st === 'fire' && b.jam > TUNE.finale.window - .05 && R.banner && R.banner.text === 'FINISH IT!', 'FINISH IT!');
    check(R.souls === souls, 'the counter keeps its souls');
    // firing: the bolt plus one soul stream flying straight beside it, for one charge
    check(!streamed, 'no shimmer before the soul is in');
    R.shots = []; R.fireT = 0; R.freeze = 0; const charge = R.charge;
    keys.kbShoot = true; update(1 / 60); keys.kbShoot = false;
    const soul = R.shots.filter(s => s.soul), bolt = R.shots.filter(s => !s.soul);
    check(bolt.length === 1 && soul.length === 1, 'a bolt and one soul stream');
    check(R.charge === charge - 1, 'for one charge');
    check(soul.every(s => s.du === 0 && !s.tgt && !s.spread), 'parallel, never homing in, and not Spread Shot');
    check(soul[0].side === 1, 'beside it, on one side');
    check(streamed === 1, 'with a quiet shimmer of its own under the zap');
    draw();
    // a soul stream does normal blaster damage (at the stunned rate)
    R.shots = soul.slice(0, 1); const hp = b.hp;
    for (let i = 0; i < 60 && R.shots.length; i++) { quiet(); update(1 / 60); }
    check(Math.abs((hp - b.hp) - TUNE.finale.dmg) < 1e-6, 'a soul stream does the finish\'s damage (' + (hp - b.hp) + ')');
    check(TUNE.lastStand / (2 * TUNE.finale.dmg) * TUNE.fireEvery >= 3.5 && TUNE.finale.window > TUNE.lastStand / (2 * TUNE.finale.dmg) * TUNE.fireEvery * 1.8, 'holding fire, bolt and stream take about four seconds to finish it, in a window with room to spare');
    // miss the window and it wakes up; the soul stays
    for (let i = 0; i < 60 * (TUNE.finale.window + .2) && b.final; i++) { quiet(); update(1 / 60); }
    check(!b.final && b.st === 'fight' && b.lastStand && b.hp > 0 && R.hint.streams === 2, 'miss the window and it shakes the stun off, with the soul still in the gun');
    attack('surge'); quiet();
    check(R.armed === true && R.hint && R.hint.streams === 2, 'with the soul in the gun, a surge breaks on it');
    const n = bells.length;
    bossDamage(10, 'smash');
    check(b.final && b.final.st === 'fire' && bells.length === n, 'the next paper knocked back stuns it again, and the window opens at once');
    // goodbye: once it's beaten (after its last line) the souls leave the gun, salute, say good luck and rise with the
    // rest; the clear waits for them
    const Y = TUNE.soulBye; bells.length = 0; R.projs = [];
    for (let i = 0; i < 60 * TUNE.finale.window && b.st === 'fight'; i++) { R.shots.push({ u: 0, z: .95, h: .2, tgt: null, dead: false }); update(1 / 60); }
    check(R.phase === 'win' && R.hint && R.hint.streams === 2, 'the blaster finishes it, with the soul still in the gun');
    let saw = false, rose = 0;
    for (let i = 0; i < 60 * 30 && R.phase === 'win' && state !== 'over'; i++) {
      update(1 / 60);
      if (R.hint && R.hint.bye && !saw) { saw = true; check(R.hint.streams === 1, 'it leaves the gun'); }
      if (R.hint && R.hint.bye && R.hint.bye.t > Y.say + .2 && R.hint.bye.t < Y.say + .3) { draw(); check(!R.events.clearBanner, 'the clear waits while it says goodbye'); }
      rose = Math.max(rose, R.fx.filter(f => f.k === 'rise').length);
    }
    check(saw && bells.length === 1 && bells[0] === 0, 'goodbye, with one bell as it comes out: one soul, one bell (' + bells + ')');
    check(rose === Math.min(40, R.souls), 'and the floor\'s souls rise with it');
    check(state === 'over' && cardTitle.textContent === 'The 13th Floor clear', 'then the clear card');
  } finally { Snd.play = play; }
})();
