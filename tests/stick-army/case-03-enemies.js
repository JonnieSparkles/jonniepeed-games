(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  newGame(); check(waveCfg(1).bombers===0 && waveCfg(2).bombers===1, 'wave two bombers');
  check(waveCfg(2).sniperChance===0 && waveCfg(3).sniperChance>0, 'wave three snipers');
  startWave(2); spawnPlane('bomber'); var p=S.planes[0]; check(p.bombRun.length===3, 'three bomb run');
  for(var i=0;i<2000;i++) updatePlanes(1/120);
  check(S.bombs.length===3,'bomber drops the whole string');
  for(var j=0;j<600;j++) updateBombs(1/120);
  check(S.wallHP<100, 'bombs actually hit bunker');
  newGame(); spawnTrooper(18,GROUND-33); var t=S.troopers[0]; t.type='sniper'; land(t);
  var r=makeRecruit(0,'rifle'); S.recruits.push(r); t.shotCD=0;
  for(var k=0;k<120;k++) { updateTroopers(1/120); updateEnemyShots(1/120); }
  check(r.hp<ENEMIES.rifle.hp && t.x===18, 'stationary sniper shoots crew');
  S.spawn.planes=S.spawn.bombers=0; S.planes=[]; updateWave(0.1);
  check(S.waveState==='active','ground enemies block clear');
  S.recruits=[]; S.enemyShots=[]; S.wallHP=100; S.heat=0; t.shotCD=0;
  var turretHit=false;
  for(var n=0;n<120*20;n++) { updateTroopers(1/120); updateEnemyShots(1/120); if (S.wallHP<100) turretHit=true; }
  check(turretHit,'no crew: sniper shoots the turret');
  check(t.dead,'then retreats, avoiding softlock');
  reset(); render();
})();
