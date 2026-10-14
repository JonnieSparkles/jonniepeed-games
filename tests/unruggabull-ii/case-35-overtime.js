// The Shredder's middle and end (owner, Oct 14): phase 2's pulls further apart, OVERTIME halfway through phase 2
// (a roar, attacks closer together, the music a notch faster), phase 3's longer volley, and the last volley playing
// out before the stun when it takes the Shredder to its last stand.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  RUN.force = 3535; startRun(); bull.inv = 1e9;
  R.beat = 2; R.beatT = BEATS[2].minT; R.souls = TUNE.goal;
  for (let i = 0; i < 60 * 14 && R.phase !== 'boss'; i++) update(1 / 60);
  const b = R.boss;
  const quiet = () => { R.projs = []; R.rows = []; R.talk = null; R.banner = null; R.pull.st = 'idle'; R.pull.next = 1e9; b.jam = 0; b.volley = null; b.rally = null; R.roll = null; b.dark = null; };

  // phase 2: pulls 8 seconds apart
  quiet(); b.hp = 60; update(1 / 60);
  check(b.ph === 2 && TUNE.bossPull.gap[1] === 8, 'phase 2 pulls 8 seconds apart');
  check(!b.overtime, 'no overtime in the first half of phase 2');
  quiet(); b.atkN = 0; b.atk = 0; update(1 / 60);
  check(Math.abs(b.atk - TUNE.attackEvery[1]) < .02, 'attacks at the usual pace before it');
  // halfway: OVERTIME
  quiet(); R.fx = []; b.hp = TUNE.overtime.at - .5; update(1 / 60);
  check(b.overtime && R.fx.some(f => f.k === 'big' && f.text === 'OVERTIME!') && R.talk && R.talk.text === 'OVERTIME. UNPAID.', 'halfway through phase 2: OVERTIME!');
  quiet(); R.freeze = 0; b.atkN = 0; b.atk = 0; update(1 / 60);
  check(Math.abs(b.atk - TUNE.overtime.every) < .02 && TUNE.overtime.every < TUNE.attackEvery[1], 'its attacks come closer together (' + b.atk + ')');
  check(R.tempo > 1, 'and the music steps up (' + R.tempo + ')');
  draw();

  // phase 3: a longer volley
  quiet(); b.hp = 30; update(1 / 60); b.dark = null; b.surgeAt = 0; R.freeze = 0; update(1 / 60);
  check(b.ph === 3 && R.tempo === 1, 'phase 3, the music back to its own pace');
  quiet(); b.surgeAt = 0; b.atkN = ATTACKS[2].indexOf('volley'); b.atk = 0; update(1 / 60);
  check(b.volley && b.volley.left === TUNE.volley.n[2] && TUNE.volley.n[2] === 8, 'phase 3 volleys are eight scraps');

  // the last volley plays out: the scrap that takes it to its last stand doesn't cut the volley short
  quiet(); b.surgeAt = 0; b.hp = TUNE.lastStand + 3; b.atkN = ATTACKS[2].indexOf('volley'); b.atk = 0; update(1 / 60);
  step(TUNE.volley.gap * 2);
  const left = b.volley.left;
  bossDamage(TUNE.scrapDmg, 'deflect');
  check(b.hp === TUNE.lastStand && b.lastStand && !b.final && b.finaleNext && b.volley && b.volley.left === left, 'its last stand mid-volley: the volley keeps coming');
  for (let i = 0; i < 60 * 6 && !b.final; i++) update(1 / 60);
  check(b.final && b.final.st === 'fetch' && !b.volley && !b.finaleNext, 'then, with its paper done, it\'s stunned and the soul goes for the blaster');
})();
