(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var originalRandom=R; R=mulberry(23);
  newGame();
  // Unattended runs must still end despite repair and wave-state transitions.
  for(var i=0;i<18000 && S.mode==='play';i++) update(1/60);
  check(S.mode==='dying','an unattended bunker falls');
  for(var j=0;j<120;j++) update(1/60);
  check(S.mode==='over' && !overScreen.hidden,'game over is reachable');
  newGame(); check(S.mode==='play' && overScreen.hidden,'restart from game over');
  // Aiming bot plays the actual bullet simulation to a genuine wave clear.
  for(var k=0;k<18000 && S.mode==='play';k++) {
    var target=S.troopers.filter(t=>!t.dead && (t.state==='chute'||t.state==='free')).sort((a,b)=>b.y-a.y)[0];
    var plane=S.planes.find(p=>p.state==='fly' && p.x>20 && p.x<380);
    if(target) {
      var travel=Math.hypot(target.x-TUR.x,target.y-TUR.y)/700;
      aimAt({x:target.x,y:target.y+12+(target.state==='chute'?target.fall:target.vy)*travel});
    } else if(plane) {
      var time=Math.hypot(plane.x-TUR.x,plane.y-TUR.y)/700;
      aimAt({x:plane.x+plane.dir*plane.speed*time,y:plane.y});
    }
    keys.fire=!!(target||plane); update(1/60);
  }
  check(S.mode==='shop' && S.wave===1 && S.stats.kills>0,'actual combat reaches the shop');
  var health=S.wallHP, time=S.t; clearInput();
  check(S.shop.free.length===2 && health>0 && time>10,'living end-of-wave shop');
  takeItem(S.shop.free[0].id); continueWave(); check(S.wave===2,'shop continues actual run');
  R=originalRandom; reset(); shopScreen.hidden=true; render();
})();
