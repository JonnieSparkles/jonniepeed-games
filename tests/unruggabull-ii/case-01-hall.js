// The hall: the blaster, temps, paper wads, deflects, carpshits and file boxes.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const quiet = () => { R.cubs = []; R.flies = []; R.projs = []; R.boxes = []; R.shots = []; R.nextFly = 1e9; R.nextBox = 1e9; R.nextCubW = R.dist + 1e9; };
  const temp = z => { const cb = { w: R.dist + z, s: 1, temp: null }; cb.temp = { cub: cb, st: 'up', t: 0, pop: 1, trig: 0, pops: 0, threw: true, dead: false }; R.cubs.push(cb); return cb.temp; };

  RUN.force = 101; startRun();
  check(state === 'play' && R.phase === 'hall' && R.hearts === 5 && R.souls === 0, 'a run starts in the hall with five hearts');
  check(card.hidden && gameEl.classList.contains('playing'), 'the card hides while playing');
  step(2);
  check(R.shots.length === 0, 'the blaster waits for you');
  keys.kbShoot = true; step(1); keys.kbShoot = false;
  check(R.events.shots === 5, 'holding shoot fires five times a second (' + R.events.shots + ')');
  step(1); press('shoot'); step(.5);
  check(R.events.shots === 6, 'a tap fires once');

  quiet(); bull.u = .6;
  const t1 = temp(.5), souls = R.souls;
  keys.kbShoot = true; step(1); keys.kbShoot = false;
  check(t1.dead && R.souls === souls + 1, 'the blaster leans toward a temp in a cubicle and frees a soul');

  quiet(); bull.u = 0; bull.inv = 0;
  const hearts = R.hearts;
  launch('wad', { u: 0, z: .3, h: .13 }, { u: 0, z: bull.bz, h: .13 }, .5);
  keys.kbShoot = true; step(.8); keys.kbShoot = false;
  check(R.hearts === hearts - 1 && bull.inv > 0, 'shots go through paper, and a wad costs a heart');
  launch('wad', { u: 0, z: .2, h: .13 }, { u: 0, z: bull.bz, h: .13 }, .3);
  step(.4);
  check(R.hearts === hearts - 1, 'no second hit while flashing');

  step(1.5); quiet(); bull.inv = 0;
  const t2 = temp(.7), wad = launch('wad', posOf(t2), { u: 0, z: bull.bz, h: .13 }, .9, { src: t2 });
  for (let i = 0; i < 120 && wad.z > bull.bz + .15; i++) update(1 / 60);
  bull.cd = 0; press('slash'); update(1 / 60);
  check(wad.friendly && R.events.deflects === 1, 'slash knocks a wad back where it came from');
  step(1);
  check(t2.dead && R.hearts === hearts - 1, 'and it takes out the temp who threw it');

  quiet(); bull.cd = 0;
  const fly = { u: bull.u, z: bull.bz + .1, h: .14, hp: 2, ph: 0, hit: 0, dead: false };
  R.flies.push(fly); press('slash'); update(1 / 60);
  check(fly.dead && R.fx.some(f => f.k === 'half'), 'slash cuts a carpshit in two');

  step(1); quiet(); bull.inv = 0; bull.jh = 0;
  const h2 = R.hearts;
  R.boxes.push({ w: R.dist + .1, u: bull.u, hit: 0 });
  step(.8);
  check(R.hearts === h2 - 1, 'walking into a file box costs a heart');
  step(1.5); quiet(); bull.inv = 0;
  const h3 = R.hearts, box = { w: R.dist + .1, u: bull.u, hit: 0 };
  R.boxes.push(box);
  for (let i = 0; i < 60 && box.w - R.dist - bull.bz > .04; i++) update(1 / 60);
  press('jump'); step(.8);
  check(R.hearts === h3 && !box.hit, 'jumping clears a file box');
})();
