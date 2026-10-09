// Deflects give the blaster charges back; the Shredder's phase 3 rally.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  RUN.force = 707; startRun();
  R.cubs = []; R.flies = []; R.projs = []; R.boxes = []; R.rows = []; R.pickups = []; R.nextFly = 1e9; R.nextBox = 1e9; R.nextRow = 1e9; R.nextCubW = R.dist + 1e9;
  bull.u = 0; bull.inv = 0;

  // a deflect gives charges back, up to the full twenty
  R.charge = 5;
  let wad = launch('wad', { u: 0, z: .5, h: .13 }, { u: 0, z: bull.bz, h: .13 }, 1);
  for (let i = 0; i < 120 && wad.z > bull.bz + .15; i++) update(1 / 60);
  bull.cd = 0; press('slash'); update(1 / 60);
  check(wad.friendly && R.charge >= 5 + TUNE.deflectCharge, 'a deflect gives the blaster ' + TUNE.deflectCharge + ' charges back');
  step(1); R.charge = TUNE.charges - 1;
  wad = launch('wad', { u: 0, z: .5, h: .13 }, { u: 0, z: bull.bz, h: .13 }, 1);
  for (let i = 0; i < 120 && wad.z > bull.bz + .15; i++) update(1 / 60);
  bull.cd = 0; press('slash'); update(1 / 60);
  check(R.charge === TUNE.charges, 'never past full');

  // to the Shredder, phase 3
  R.beat = 2; R.beatT = BEATS[2].minT; R.souls = TUNE.goal;
  for (let i = 0; i < 60 * 12 && R.phase !== 'boss'; i++) update(1 / 60);
  const b = R.boss;
  check(b.st === 'fight', 'the fight is on');
  R.pull.next = 1e9; b.hp = 30; b.atk = 1e9; update(1 / 60);
  check(b.ph === 3, 'phase three');
  R.projs = []; R.talk = null; R.banner = null; b.atk = 0; b.atkN = 0; bull.inv = 1e9; update(1 / 60);
  check(b.rally && R.projs.filter(p => p.rally).length === 1, 'phase three serves a rally');
  check(R.banner && R.banner.text === 'RALLY!', 'with a prompt the first time');
  check(b.rally.target >= 1 && b.rally.target <= TUNE.rally.most, 'it bats back 1 to ' + TUNE.rally.most + ' returns');
  b.rally.target = 3;
  const ball = R.projs.find(p => p.rally);
  const durs = [];
  function returnIt() {
    for (let i = 0; i < 300 && (ball.friendly || ball.z > bull.bz + .15); i++) update(1 / 60);
    bull.cd = 0; press('slash'); update(1 / 60);
    check(ball.friendly, 'knock the rally bundle back');
    for (let i = 0; i < 120 && ball.friendly && !ball.dead; i++) update(1 / 60);
  }
  for (let n = 1; n <= 3; n++) {
    returnIt();
    if (n < 3) {
      check(!ball.friendly && b.rally.count === n, 'the Shredder bats it back (' + n + ')');
      durs.push((ball.z - bull.bz) / -ball.vz);
    }
  }
  check(durs[1] < durs[0], 'quicker each time');
  const hp = b.hp;
  returnIt();
  check(ball.dead && !b.rally && b.jam > 0, 'it misses the last one and reels');
  check(near(hp - b.hp, TUNE.rally.smash + TUNE.rally.smashPer * 3) || b.hp === 0, 'a smash worth ' + (TUNE.rally.smash + TUNE.rally.smashPer * 3));

  // missing a return ends the rally and costs a heart
  b.hp = 30; b.jam = 0; R.projs = []; R.talk = null; b.atk = 0; b.atkN = 0; update(1 / 60);
  check(b.rally, 'another serve');
  bull.inv = 0; const hearts = R.hearts; bull.u = R.projs.find(p => p.rally).vu > 0 ? -.1 : .1;
  step(2.5);
  check(!b.rally && R.hearts === hearts - 1, 'miss it and the rally is over, a heart down');
})();
