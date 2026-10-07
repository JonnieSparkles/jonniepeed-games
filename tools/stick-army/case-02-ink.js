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
  render(); reset(); check(decals.length===0, 'new run cleans page');
})();
