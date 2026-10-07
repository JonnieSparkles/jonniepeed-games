(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  function equip(id) { ITEMS.find(it=>it.id===id).apply(S); }
  newGame(); equip('double'); equip('spread'); equip('pierce'); equip('rockets');
  for(var i=0;i<4;i++) shoot();
  check(S.bullets.filter(b=>b.kind==='bullet').length===24 && S.bullets.filter(b=>b.kind==='rocket').length===1,'double/spread/rocket composition');
  var bullet=S.bullets[0]; S.planes=[]; S.troopers=[];
  [260,280,300].forEach(y=>spawnTrooper(200,y));
  S.troopers.forEach(function(t) { bullet.x=t.x; bullet.y=t.y+10; hitTest(bullet); });
  check(S.troopers.every(t=>t.dead) && bullet.dead,'piercing kills three distinct targets');
  newGame(); equip('flak'); shoot(); var f=S.bullets[0];
  var p=makePlane('plane',1,200,200); S.planes=[p]; f.x=200; f.y=220; hitTest(f);
  check(p.state==='fall' && f.dead,'flak proximity detonation');
  newGame(); equip('sandbags'); check(S.mods.maxHP===125 && S.wallHP===125,'sandbags raise cap');
  S.wallHP=120; equip('repair'); check(S.wallHP===125,'repair clamps at upgraded cap');
  equip('tramp'); equip('mat'); check(activeTramps().length===2 && TRAMPS[0].x2-TRAMPS[0].x1===82,'second mat and width');
  equip('hire-medic'); var med=S.recruits[0], r=makeRecruit(4,'rifle'); r.hp=1; S.recruits.push(r); med.cd=0; updateRecruits(0.1);
  check(r.hp>1 && med.role==='heal','medic heals crew');
  equip('mines'); startWave(2); spawnTrooper(100,GROUND-33); var t=S.troopers[0]; t.type='rifle'; land(t); updateTroopers(0.01);
  check(t.dead && !S.mines[0].armed && !r.dead,'mines spare crew');
  newGame(); spawnTrooper(18,GROUND-33); var sn=S.troopers[0]; sn.type='sniper'; land(sn);
  // Snipers have no immunity: a low shot skimming the field reaches one at the edge.
  aimAt({x:18,y:GROUND-20}); shoot();
  for(var k=0;k<120 && !sn.dead;k++) updateBullets(1/60);
  check(sn.dead,'a low shot across the field kills an edge sniper');
  newGame(); equip('auto'); spawnTrooper(120,500); S.troopers[0].open=1; updateAutoTurret(0.1); check(S.bullets.length===1,'auto turret fires');
  newGame(); equip('catcher'); spawnTrooper(56,490); S.troopers[0].open=1;
  check(aimPoint(makeRecruit(0,'rifle'),S.troopers[0]).y<490,'trained crew aims for low chute');
  reset(); render();
})();
