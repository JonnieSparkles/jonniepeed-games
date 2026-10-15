// The ending after dawn (ending.js, ending-plan.md): six shots between dawn and the roof's clear card, out of his
// hands, the stills over everything and the HUD gone; the run's time stops where it starts; nothing it does moves the
// outcome; #stage=roof&at=ending goes straight to it.
(function () {
  const check = (ok, why) => { if (!ok) throw new Error(why); };
  const tick = s => { for (let i = 0; i < Math.ceil(s * 60); i++) update(1 / 60); };
  const fresh = () => { RUN.force = 42; checkpoint = null; newRun(null, 'roof'); setState('play'); card.hidden = true; clearHeld(); input.jump = input.slash = input.shoot = 0; };
  const played = [], spoken = [], oldPlay = Snd.play, oldSay = Snd.say;
  Snd.play = name => played.push(name); Snd.say = text => spoken.push(text);
  try {
    fresh(); R.roof.broken = 3; R.roof.round = 3; floor.enter('dawn');
    const E = floor.ending, souls = R.souls;
    check(E.SHOTS.map(s => s.id).join() === 'breathe,tower,eye,escape,reaction,card', 'six shots in order');
    tick(floor.ROOF.time.dawn + .05);
    check(R.roof.state === 'ending' && E.at().i === 0 && !floor.cutActive(), 'dawn hands over to the ending, on the roof first');
    const from = R.roof.endingFrom, shown = floor.displayedCount();
    check(Math.abs(from - R.t) < .05, 'the run time stops where the ending starts');
    // out of his hands: moving and shooting do nothing
    const u = bull.u, shots = R.shots.length; keys.kbRight = true; keys.kbShoot = true; tick(.5); keys.kbRight = false; keys.kbShoot = false;
    check(bull.u === u && R.shots.length === shots, 'no moving or shooting in the ending');
    R.hearts = 1; played.length = 0; tick(2);
    check(!played.includes('thump') && !lowHealth(), 'no low-health heartbeat in the ending');
    R.hearts = 5;
    check(floor.hudAlpha() < 1 && floor.scene(), 'the HUD fades and the touch controls go');
    tick(2.1);
    check(E.at().i === 1 && floor.cutActive() && floor.hudAlpha() === 0, 'the tower is a picture over everything');
    // every shot draws (the picture's pixels change) without touching the run
    const before = JSON.stringify({ s: R.souls, t: R.roof.state, seed, at: E.at() });
    draw(); const px = () => Array.from(view.getImageData(0, 0, 8, 8).data).join();
    check(JSON.stringify({ s: R.souls, t: R.roof.state, seed, at: E.at() }) === before, 'drawing changes nothing');
    const frames = new Set([px()]);
    tick(E.SHOTS[1].dur - E.at().t + E.E.eye.blink[0] + .05);
    draw(); frames.add(px());
    check(E.at().i === 2 && played.includes('armorClank'), "the eye: the blue light blinks with Loomy's clack");
    tick(E.E.eye.red - E.at().t + .05);
    check(played.includes('zap') && played.includes('rumble'), 'then it floods red and groans');
    tick(E.SHOTS[2].dur - E.at().t + .05);
    check(E.at().i === 3 && !floor.cutActive(), 'back on the roof for the escape');
    draw(); frames.add(px());
    tick(E.E.escape.cables[3] + .05);
    check(played.filter(n => n === 'cableSnap').length === 4 && bull.aimT > 0, 'four cables snap; he has the blaster up');
    tick(E.E.escape.tear - E.at().t + .05);
    check(played.includes('machineBreak') && R.white > 0, 'it tears loose with a flash');
    const lights = []; floor.lights({ light: (...a) => lights.push(a) });
    check(lights.some(l => l[3] > 1 && l[4] < .1), 'the eye lights the roof red as it goes');
    tick(E.SHOTS[3].dur - E.at().t + .05);
    draw(); frames.add(px());
    check(E.at().i === 4 && floor.cutActive() && bull.aimT === 0, 'the reaction, and he has lowered the blaster');
    tick(E.E.line + .1);
    check(R.bark && R.bark.text === 'OH, COME ON.', 'his line');
    tick(E.SHOTS[4].dur - E.at().t + .05);
    check(E.at().i === 5, 'the card');
    tick(E.E.card.at); draw(); frames.add(px());
    check(frames.size >= 4, 'each shot draws its own picture');
    tick(E.SHOTS[5].dur - E.at().t - .3);
    check(spoken.includes('... TO BE CONTINUED...') && spoken.includes('MAYBE.') && R.roof.state === 'ending', '... TO BE CONTINUED... then MAYBE.');
    tick(.5);
    check(R.roof.state === 'clear' && state === 'over' && Cards.kind === 'clear' && Cards.info.dept === 'ROOF', 'then the roof clear card');
    check(R.endT === from && R.souls === souls && floor.displayedCount() === shown, 'the time, the souls and the count are as they were at dawn');
    check(floor.hudAlpha() === 0 && !floor.scene(), 'the HUD stays away behind the card; the scene is over');
    check(floor.stageNo() === 15, 'the ending counts as cleared in the reports');
    // #stage=roof&at=ending goes straight to dawn, with the fight won
    const hash = location.hash; history.replaceState(null, '', '#stage=roof&at=ending');
    fresh(); history.replaceState(null, '', hash || '#');
    check(R.roof.state === 'dawn' && R.roof.broken === 3 && R.roof.history.join() === 'dawn', 'at=ending starts at dawn');
    fresh(); check(R.roof.state === 'elevator' && floor.hudAlpha() === 1, 'a fresh roof run starts at the elevator, the HUD back');
  } finally { Snd.play = oldPlay; Snd.say = oldSay; }
})();
