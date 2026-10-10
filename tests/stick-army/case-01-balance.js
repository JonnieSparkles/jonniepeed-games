(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  // Over the first mat, whichever side the run put it on.
  function matX() { return (TRAMPS[0].x1 + TRAMPS[0].x2) / 2; }
  newGame();
  check(activeTramps().length === 1 && S.mods.slots === 4, 'baseline mat and squad');
  [0,4,1,5].forEach(function (slot) { S.recruits.push(makeRecruit(slot, 'rifle')); });
  check(freeSlot(0) === -1, 'only four available slots');
  S.mods.slots++; check(freeSlot(0) === 2, 'fifth unlock');
  function drop(y) {
    S.troopers = []; spawnTrooper(matX(), y); var t=S.troopers[0]; t.open=1; popChute(t);
    for (var i=0; i<240 && !t.dead && t.state!=='bounce'; i++) updateTroopers(1/120);
    return t;
  }
  check(drop(490).state === 'bounce', 'low cut captures');
  check(drop(300).state === 'bounce', 'mid-sky cut still captures');
  check(drop(140).dead, 'a cut right under the planes rips through');
  var r=makeRecruit(0,'rifle'); S.troopers=[]; spawnTrooper(matX(), 300); S.troopers[0].open=1;
  check(pickTarget(r)===null, 'crew leaves upper sky to player');
  S.troopers[0].y=490;
  check(aimPoint(r,S.troopers[0]).y>490,'baseline crew aims for body');
  check(waveCfg(4).planes>waveCfg(1).planes && waveCfg(4).fall>waveCfg(1).fall,'harder waves');
  reset(); render();
})();
