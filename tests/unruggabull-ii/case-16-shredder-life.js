// The Shredder's life: it lunges as it attacks, rears back before, recoils when hit, laughs and taunts when you miss a
// return (rationed), roars into a new phase; its eyes follow you; it drops shredded strips while it chews. And Shoot
// greys out while you're crouched.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  RUN.force = 1616; startRun(); bull.inv = 1e9; R.beat = 2; R.beatT = BEATS[2].minT; R.souls = TUNE.goal;
  for (let i = 0; i < 60 * 14 && R.phase !== 'boss'; i++) update(1 / 60);
  const b = R.boss;
  check(b.st === 'fight', 'the fight is on');
  const reset = () => { R.projs = []; R.rows = []; R.talk = null; R.banner = null; R.pull.next = 1e9; b.jam = 0; b.volley = null; b.rally = null; b.push = 0; b.pushV = 0; };

  // it rears back as its mouth glows, then lunges as it spits
  reset(); b.atkN = ATTACKS[0].indexOf('bundle'); b.atk = TUNE.tell + .02;
  update(1 / 60); update(1 / 60);
  check(b.rev > 0 && b.pushV < 0, 'it rears back before an attack');
  reset(); b.atkN = ATTACKS[0].indexOf('bundle'); b.atk = 0; update(1 / 60);
  step(.05);
  check(b.push > .05, 'and lunges as it spits (' + b.push.toFixed(2) + ')');
  for (let i = 0; i < 90; i++) { b.atk = 1e9; update(1 / 60); }
  check(Math.abs(b.push) < .05, 'then settles');

  // a deflected bundle makes it recoil
  reset(); b.atk = 1e9; bossDamage(TUNE.bundleDmg, 'deflect'); step(.05);
  check(b.push < -.05, 'a heavy hit makes it recoil');

  // you miss a return: it lunges forward laughing, and says so (once in a while)
  reset(); bull.u = 0; bull.bz = 0; bull.inv = 0; b.tauntT = 0;
  b.atkN = ATTACKS[0].indexOf('rally'); b.atk = 0; update(1 / 60); b.atk = 1e9;
  bull.u = .5;   // step out of the way and let it go by
  for (let i = 0; i < 120 && b.rally; i++) { b.atk = 1e9; update(1 / 60); }
  check(!b.rally && b.laugh > 0 && (b.pushV > 0 || b.push > 0), 'a missed return: it laughs and lunges');
  // and a taunt when it hits you
  reset(); bull.inv = 0; b.tauntT = 0; const hearts = R.hearts;
  hurtBull(1, 'bundle');
  check(R.hearts === hearts - 1 && R.talk && TAUNTS.hit.includes(R.talk.text), 'a hit gets a taunt (' + (R.talk && R.talk.text) + ')');
  check(b.laugh > 0, 'and a laugh');
  draw();
  R.talk = null; bull.inv = 0; hurtBull(1, 'bundle');
  check(!R.talk, 'but not again straight away');
  bull.inv = 1e9;

  // its eyes follow you: the pupils sit to the side you're on
  reset(); b.blink = -1; b.laugh = 0; b.chomp = 0; b.rev = 0;
  // (no shake, no red flash, so the eye sits where it's drawn; its pupil is the dark gap in the red)
  const pupil = u => {
    bull.u = u; R.shake = 0; R.red = 0; b.push = 0; b.pushV = 0; draw();
    const d = g.getImageData(102, BACK.y0 + 18, 14, 1).data, xs = [];
    for (let i = 0; i < 14; i++) if (d[i * 4] > 120) xs.push(i);
    for (let i = xs[0]; i < xs[xs.length - 1]; i++) if (d[i * 4] < 60) return i - xs[0];
    return -1;
  };
  const left = pupil(-.6), right = pupil(.6);
  check(left >= 0 && right > left, 'its pupils follow you (' + left + ', ' + right + ')');

  // it chews: shredded strips drop out of its mouth
  reset(); R.fx = []; let strips = 0;
  for (let i = 0; i < 120; i++) { update(1 / 60); if (R.fx.some(f => f.k === 'strip')) strips++; }
  check(strips > 0, 'shredded strips drop from its mouth');

  // into a new phase it roars forward
  reset(); b.hp = 60; update(1 / 60);
  check(b.ph === 2 && b.pushV > 5, 'it roars into phase 2');

  // Shoot greys out while you're crouched
  document.body.classList.add('touch');
  bull.jh = 0; keys.kbDown = true; update(1 / 60); padRings();
  check(document.querySelector('.pad.shoot').classList.contains('off'), 'Shoot greys out while crouched');
  keys.kbDown = false; update(1 / 60); padRings();
  check(!document.querySelector('.pad.shoot').classList.contains('off'), 'and comes back when he stands');
})();
