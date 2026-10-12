// One carried supply. Effects use existing combat; icon drawing is deliberately replaceable.
var UnrugDrops = function (core) {
  'use strict';
  const { A, Snd, TUNE, emit, live, rect, txt } = core;
  const DROPS = { bullRunT: 5, chargeSpeed: .3, reach: .07, icon: { x: 56, y: 17, w: 16, h: 17 } };
  const NAMES = { spread: 'Spread Shot', bullRun: 'Bull Run', vest: 'Spare Vest' };
  let R, bull;
  function newRun(r, b, at) { R = r; bull = b; R.heldDrop = at && at.heldDrop || null; R.bullRun = 0; R.dropNext = at && at.dropNext || 'spread'; }
  function choose() { return R.hearts <= 2 ? 'vest' : R.dropNext; }
  function give(kind = choose()) {
    R.heldDrop = kind;
    if (kind !== 'vest') R.dropNext = kind === 'spread' ? 'bullRun' : 'spread';
    emit('supply', { item: kind }); Snd.play('appear'); live(NAMES[kind] + '. ' + (kind === 'vest' ? 'Used automatically if rugged.' : 'Tap its icon or press E to use.'));
  }
  function use() {
    if (!R.heldDrop || R.heldDrop === 'vest' || !['hall', 'boss', 'wake'].includes(R.phase)) return false;
    const kind = R.heldDrop; R.heldDrop = null; core.saveDropState();
    if (kind === 'spread') { R.spread = TUNE.spreadT; R.charge = TUNE.charges; }
    else R.bullRun = DROPS.bullRunT;
    emit('supply_use', { item: kind }); Snd.play('power'); return true;
  }
  function save() {
    if (R.heldDrop !== 'vest') return false;
    R.heldDrop = null; core.saveDropState(); R.hearts = TUNE.hearts; bull.inv = TUNE.hurtInv;
    // Get back up at the fallen position; don't enter a card or disturb stage timers.
    bull.mouth = bull.spat = 0;
    emit('supply_use', { item: 'vest' }); Snd.play('ready'); live('Spare Vest: full hearts.'); return true;
  }
  function tick(dt, floor) {
    if (!(R.bullRun > 0)) return;
    R.bullRun = Math.max(0, R.bullRun - dt);
    if (floor.arena) return; // Arena has its own side-view contacts and charge.
    if (floor.id === 'roof') { if (floor.bullRun) floor.bullRun(dt); }
    else bull.bz = Math.min(.7, bull.bz + DROPS.chargeSpeed * dt);
    for (const f of R.flies) if (!f.dead && Math.abs(f.u - bull.u) < .18 && Math.abs(f.z - bull.bz) < DROPS.reach) core.killFly(f, 'bullRun');
    for (const p of R.projs) if (Math.abs(p.u - bull.u) < .2 && Math.abs(p.z - bull.bz) < DROPS.reach) p.dead = true;
    for (const bx of R.boxes) if (Math.abs(bx.u - bull.u) < .2 && Math.abs(bx.w - R.dist - bull.bz) < DROPS.reach) bx.hit = .001;
    for (const row of R.rows) if (Math.abs(row.w - R.dist - bull.bz) < DROPS.reach) row.hit = .001;
    for (const cb of R.cubs) if (cb.temp && !cb.temp.dead) { const p = floor.posOf(cb.temp); if (Math.abs(p.u - bull.u) < .22 && Math.abs(p.z - bull.bz) < DROPS.reach) floor.killTemp(cb.temp, 'bullRun'); }
  }
  function drawIcon(g, kind, x, y) {
    rect(g, x, y, 14, 14, '#24222f'); rect(g, x + 1, y + 1, 12, 12, '#6e5e50');
    if (kind === 'spread') g.drawImage(A.SPREAD, x + 2, y + 2, 10, 10);
    else if (kind === 'vest') g.drawImage(A.HEART, x + 3, y + 3, 8, 8);
    else { lineHorn(g, x + 3, y + 3); lineHorn(g, x + 9, y + 3); }
  }
  function lineHorn(g, x, y) { rect(g, x, y, 2, 6, '#fff6e2'); rect(g, x + 2, y + 4, 2, 2, '#ffd44a'); }
  function hud(g) {
    if (R.heldDrop) { drawIcon(g, R.heldDrop, DROPS.icon.x, DROPS.icon.y); txt(g, R.heldDrop === 'vest' ? '1' : 'E', 62, 32, '#ffd44a'); }
    if (R.bullRun > 0) { txt(g, 'BULL RUN', 4, 27, '#ffd44a'); }
  }
  return { DROPS, NAMES, newRun, choose, give, use, save, tick, hud, drawIcon };
};
