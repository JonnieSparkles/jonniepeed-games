(function () {
  const check = (ok, why) => { if (!ok) throw new Error(why); };
  const step = window.__balance.step; let last = 0, samples = 0;
  window.__balance.step = function (dt) {
    step(dt);
    if (R.stage !== 'roof' || !['quiet','return','flood','pinch','fusion','lines','beam','run','one','snap','dawn','clear'].includes(R.roof.state)) return;
    const count = floor.displayedCount();
    check(count >= last, 'displayed souls never decrease from quiet through clear'); last = count; samples++;
  };
  try {
    window.__balanceDriver.begin({seed:42,skill:'expert',profile:window.roofProfiles.expert,options:{stage:'roof'},cap:300});
    let done = false; for (let i=0;i<30&&!done;i++) done=window.__balanceDriver.run(600).done;
    check(done && R.roof.state === 'clear' && samples > 100, 'real seed-42 expert reaches clear through the counter test');
    const card = floor.clearCard(null,{souls:0},String);
    check(Number(card.rows[0][1]) === last && last === R.souls + R.roof.dawnCount, 'clear card keeps the additive dawn total without changing seeded score');
  } finally { window.__balance.step = step; }
  newRun(null,'roof'); floor.enter('flash'); R.roof.t = .4;
  const drawImage=g.drawImage;let bright=0, dark=0;
  g.drawImage=function(img,...args){ if(img===A.GHOST)bright++;else dark++;return drawImage.call(this,img,...args); };
  floor.drawWarp('souls');g.drawImage=drawImage;
  check(bright===0&&dark===R.roof.caught,'souls stay dark even after the lightning falloff');
  floor.effects.shake(7,1);floor.cutIn('snap',.5);
  const random=Math.random;Math.random=()=>.99;const before=floor.shakeOffset()[0];
  for(let i=0;i<20;i++)update(1/60);
  check(floor.shakeOffset()[0]===before,'cut-ins preserve the shake impulse');Math.random=random;
  emitHook=null;RUN.force=null;checkpoint=null;newRun();setState('title');showCard('title');
})();
