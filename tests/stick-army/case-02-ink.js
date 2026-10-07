(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  newGame(); spawnTrooper(70, 300); killTrooper(S.troopers[0], 'player');
  check(S.parts.filter(q=>q.k==='body').length===6, 'six body pieces');
  check(S.parts.filter(q=>q.head).length===1, 'one head');
  for(var i=0;i<1100;i++) updateParts(1/120);
  check(S.parts.length===0 && decals.filter(q=>q.kind==='body').length===6, 'settle then persist');
  var before=decals.length; fit(); check(decals.length===before, 'resize preserves ink');
  for(var j=0;j<520;j++) addDecal({kind:'splat', x:60,y:600,r:1,color:RED,a:0.2,seed:j});
  check(decals.length===500, 'bounded decal history');
  reset();
  S.parts=[{k:'fleck',x:80,y:200,vx:0,vy:0,life:0.01,c:RED,id:1}]; updateParts(0.02);
  check(decals.length===0,'expired airborne fleck leaves no sky decal');
  S.parts=[{k:'fleck',x:80,y:GROUND-1,vx:0,vy:100,life:0.01,c:RED,id:2}]; updateParts(0.02);
  check(decals.length===1 && decals[0].y===GROUND,'landed fleck stamps ground ink');
  // A cap rollover must never clear/redraw the current raster during play.
  var clears=0, originalClear=dcx.clearRect;
  dcx.clearRect=function(){ clears++; return originalClear.apply(dcx,arguments); };
  for(var k=0;k<510;k++) addDecal({kind:'splat',x:60,y:600,r:1,color:RED,a:0.2,seed:k});
  render(); check(clears===0 && decals.length===500,'new ink stamps once past cap');
  fit(); check(clears>0 && decals.length===500,'only resize replays retained marks');
  dcx.clearRect=originalClear;
  render(); reset(); check(decals.length===0, 'new run cleans page');
})();
