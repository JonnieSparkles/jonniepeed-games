// The stairwell: the ground line, the katana gate, the Rugmergency, the tape, the whip, tumblers, continues and the door.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const S = floors.stairs;
  RUN.force = 3434; startRun('stairs'); bull.inv = 1e9;
  check(R.stage === 'stairs' && R.phase === 'boss' && S.Q.si === 0 && !S.Q.katana && R.arena.bare, 'Start of the stairs: section 1, blaster only, no katana on his back');
  check(Snd.track === 'stairs', 'Flight Risk plays');
  // the ground: the landings and the slopes, in h; he stands on it and his bolts leave from it
  const sec = S.SECTIONS[0], lowH = S.HY(246), topH = S.HY(106);
  check(Math.abs(S.ground(S.UX(40)) - lowH) < 1e-9 && Math.abs(S.ground(S.UX(470)) - topH) < 1e-9 && S.ground(S.UX(180)) > lowH && S.ground(S.UX(180)) < topH, 'the ground follows the stairs');
  bull.u = S.UX(290); R.shots = []; R.fireT = 0; keys.kbShoot = true; update(1 / 60); keys.kbShoot = false;
  check(R.shots.length && Math.abs(R.shots[0].h - (S.ground(bull.u) + S.arena.ARENA.muzzleH)) < 1e-9, 'bolts leave the blaster at his height on the stairs');
  // no katana yet: Slash does nothing
  bull.cd = 0; press('slash'); update(1 / 60);
  check(bull.slash < 0, 'no slashing before the Rugmergency');
  // the section's script, cleared: the way up opens, and the edge whips up to section 2
  R.arena.enemies = []; S.Q.script = sec.script.length; update(1 / 60);
  check(S.Q.exitOpen, 'cleared: the way up opens');
  R.hearts = 2; bull.u = S.arena.ARENA.limit; update(1 / 60);
  check(S.Q.st === 'whip' && S.Q.si === 1 && R.hearts === TUNE.hearts, 'the whip up: section 2, full hearts');
  step(S.STAIRS.whip + .05);
  check(S.Q.st === 'play' && !R.arena.locked && bull.facing === -1, 'section 2: right to left');
  // the cabinet: dark until the carpshits on the way up are dealt with; a bolt can't break it before that
  const cab = S.SECTIONS[1].cab;
  check(!S.cabReady(), 'the cabinet is dark at first');
  bull.u = S.UX(cab.x + 90); bull.facing = -1; R.shots = []; R.fireT = 0; keys.kbShoot = true; step(.3); keys.kbShoot = false;
  check(S.Q.glass === Infinity, 'the glass holds until it is ready');
  R.shots = []; R.arena.enemies = []; S.Q.script = S.SECTIONS[1].pre.length; update(1 / 60);
  check(S.cabReady(), 'the carpshits dealt with: the cabinet wakes');
  R.fireT = 0; keys.kbShoot = true; step(.3); keys.kbShoot = false;
  check(S.Q.st === 'rug' && R.arena.locked && Snd.track === null, 'a bolt through the glass: the Rugmergency, the music stops dead');
  step(S.STAIRS.rug.raise + .1);
  check(Snd.track === 'stairsFanfare' && R.arena.pose && R.banner && R.banner.text === 'RUGMERGENCY KATANA', 'the item get, to the fanfare');
  check(floor.view().ambient < S.STAIRS.ambient, 'the stairwell darkens around him');
  step(5);
  check(S.Q.st === 'play' && S.Q.katana && !R.arena.bare && !R.arena.locked && Snd.track === 'stairs', 'the katana: the cue slams back in');
  check(checkpoint && checkpoint.stage === 'stairs' && checkpoint.section === 1 && checkpoint.katana, 'a continue from here keeps the katana');
  bull.cd = 0; press('slash'); update(1 / 60);
  check(bull.slash >= 0, 'slashing now');
  // the tape: he can't pass it until he cuts it
  step(.4); R.arena.enemies = []; R.arena.thrown = []; S.Q.script = S.SECTIONS[1].script.length; update(1 / 60);
  check(S.Q.exitOpen && S.Q.tapeCut == null, 'cleared, but the tape is up');
  keys.kbLeft = true; step(1.5); keys.kbLeft = false;
  check(S.Q.st === 'play' && S.Q.si === 1 && bull.u > S.UX(S.SECTIONS[1].tape.x), 'the tape stops him');
  bull.u = S.UX(S.SECTIONS[1].tape.x + 40); bull.facing = -1; bull.cd = 0; press('slash'); update(1 / 60);
  check(S.Q.tapeCut != null, 'a slash cuts the tape');
  keys.kbLeft = true; step(1.2); keys.kbLeft = false;
  check(S.Q.si === 2, 'and he goes on up');
  step(S.STAIRS.whip + .05);
  // tumblers: down the stairs at him, cut or shot like the rest
  R.arena.enemies = []; const e = S.roll();
  check(e.dir === -1 && e.u > 1, 'a tumbler from the top of the flight');
  bull.inv = 0; R.hearts = TUNE.hearts; bull.u = S.UX(150); step(3);
  check(R.hearts < TUNE.hearts, 'a tumbler that reaches him hurts');
  // a continue from section 2 starts it over with the katana and the cabinet empty
  const souls = R.souls;
  newRun({ stage: 'stairs', section: 1, katana: true, souls }); floor.resume();
  check(R.stage === 'stairs' && S.Q.si === 1 && S.Q.katana && S.Q.glass < 0 && R.continues === 1, 'continue: back on the landing, katana in hand');
  // the door: the line, the band on the kick, then the 13th Floor without the band starting over
  RUN.force = 3435; startRun('stairs'); S.Q.katana = true; S.startSection(2); bull.inv = 1e9;
  R.arena.enemies = []; S.Q.script = S.SECTIONS[2].script.length; update(1 / 60);
  bull.u = S.UX(370); update(1 / 60);
  check(S.Q.st === 'door' && Snd.track === null, 'at the door: the music stops');
  step(S.STAIRS.door.line + .05);
  check(R.bark && R.bark.text === 'OK... HERE WE GO.', 'he catches his breath: OK... HERE WE GO.');
  step(S.STAIRS.door.kick - S.STAIRS.door.line);
  check(Snd.track === 'floorHall', 'the band slams in on the kick');
  step(S.STAIRS.door.hall - S.STAIRS.door.kick + .05);
  check(R.stage === 'floor13' && R.fromStairs && R.souls === 0 && R.white > 0 && Snd.track === 'floorHall', 'through the door: the 13th Floor, the band still playing, its meter at 0');
  check(R.banner && R.banner.text === 'THE 13TH FLOOR', 'with its own banner');
  // the 13th Floor on its own still opens on its band
  startRun('floor13');
  check(!R.fromStairs && Snd.track === 'floorHall', 'the 13th Floor on its own');
  RUN.force = null;
})();
