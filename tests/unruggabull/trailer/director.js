// Unruggabull: the trailer's scripted player. Evaluated inside src/controller.js through the module bridge (see
// trailer.json), so the game's own modules are in scope: state, player, enemyCarpshits, enemyLowerCarpshits, levels.
// It plays through the keyboard, like a player (A/D to move, Space to jump, F to fire), and adds plan items:
//   title                   dismiss the "Press any key" overlay
//   fight  {until | dur}    clear the alley: pick a carpshit, get onto a floor or platform where a jump lines the
//                           blaster up with it, face it and fire
//   boss   {until | dur}    fight the Rugfather: stay at range, jump his flaming carpets, fire when he's in line
//   hold   {keys, dur}      hold keys for a while (a walk, a run)
// Staging switches, set from `js` items: D.minHealth (health never drops below it), D.wave(n) (jump to wave n:
// the next couple of kills start it, so the boss can arrive on cue).
(() => {
  const D = window.__D;
  const E = code => window.__trailerEval(code);
  const S = E('state'), P = E('player'), UP = E('enemyCarpshits'), LOW = E('enemyLowerCarpshits');
  const level = E('levels')[S.currentLevelKey];
  let boss = null, projectiles = [];
  import(new URL('/src/levels/rugcoAlley/rugfather.js', location.href).href).then(m => { boss = m; });
  import(new URL('/src/projectiles/index.js', location.href).href).then(m => { projectiles = m.projectiles; });

  // ---------- keyboard, as a player would press it
  const held = new Set();
  const key = (k, down) => {
    if (down === held.has(k)) return;
    down ? held.add(k) : held.delete(k);
    document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k, bubbles: true, cancelable: true }));
  };
  const tap = k => { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); document.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })); };
  const release = () => { for (const k of [...held]) key(k, false); };
  // a jump holds Space for a few frames: the game reads keys once a frame
  let jumpHold = 0;
  const jump = () => { key(' ', true); jumpHold = 3; };
  D.stage.push(() => { if (jumpHold && --jumpHold === 0) key(' ', false); });
  let fireUp = false;
  function fire() { if (fireUp) { key('f', false); fireUp = false; return; } key('f', true); fireUp = true; }   // one shot per press
  function steer(dir) { key('d', dir > 0); key('a', dir < 0); }

  D.start = () => { document.getElementById('start-btn').click(); };
  D.state = () => ({ gs: S.gameState, kills: S.killCount, wave: S.difficultyLevel, hp: P.health, x: Math.round(P.x), y: Math.round(P.feetY),
    boss: boss ? Math.max(0, boss.__bossState.hp) : null, phase: boss ? boss.__bossState.phase : null });
  D.onItem = () => { release(); fireUp = false; };

  // ---------- markers
  const prev = { gs: '', kills: 0, wave: 1, hp: 20, triggered: false, battle: false, phase: 0, dying: false };
  D.watch.push(() => {
    if (S.gameState !== prev.gs) { D.mark('gs:' + S.gameState); prev.gs = S.gameState; }
    if (S.killCount > prev.kills) D.mark('kill');
    prev.kills = S.killCount;
    if (S.difficultyLevel !== prev.wave) { D.mark('wave:' + S.difficultyLevel); prev.wave = S.difficultyLevel; }
    if (P.health < prev.hp) D.mark('hit');
    prev.hp = P.health;
    if (S.getBossTriggered() && !prev.triggered) { D.mark('boss:trigger'); prev.triggered = true; }
    if (S.getBossBattleStarted() && !prev.battle) { D.mark('boss:battle'); prev.battle = true; }
    if (boss) {
      const b = boss.__bossState;
      if (b.phase !== prev.phase) { D.mark('boss:phase' + b.phase); prev.phase = b.phase; }
      if (b.dying && !prev.dying) { D.mark('boss:dying'); prev.dying = true; }
    }
    // voice lines and the big sounds, by file, from the harness's media log
    const log = window.__snd;
    for (; D.seen < log.length; D.seen++) {
      const e = log[D.seen];
      if (e.ev === 'play' && /unruggabull\/|rugfather\/|garage-door|badass/.test(e.src)) D.mark('say:' + e.src.split('/').pop().replace('.mp3', ''));
    }
  });
  D.seen = 0;

  D.stage.push(() => {
    if (D.minHealth && P.health < D.minHealth) P.health = D.minHealth;
  });
  // jump to wave n: the next two kills start it (wave 6 brings the boss)
  D.wave = n => { S.setDifficultyLevel(n - 1); S.setNextPhaseKillCount(S.killCount + 2); };

  // ---------- where the blaster can reach
  const GUN = 43, JUMP = 118;                        // the shot leaves 43 px above the feet; a jump lifts ~120 px
  const surfaces = () => [{ y: level.floorY, x0: -1e4, x1: 1e4 }].concat(level.platforms.map(p => ({ y: p.y, x0: p.x, x1: p.x + p.width })));
  const standing = () => surfaces().find(s => Math.abs(P.feetY - s.y) < 1 && P.grounded && P.x + 64 > s.x0 && P.x < s.x1);
  const band = e => [e.y + 8, e.y + 42];             // where a shot hits a carpshit
  const reachFrom = (s, e) => { const [a, b] = band(e); return s.y - GUN >= a && s.y - GUN - JUMP <= b; };
  const alive = () => UP.concat(LOW).filter(e => e.alive && !e.falling && e.x > -40 && e.x < 980);

  function inLine(e) {
    const y = P.y + 53, [a, b] = band(e);
    if (y < a || y > b) return 0;
    const dx = e.x + 32 - (P.x + 32);
    // a shot moves 10 px a frame, the carpshit about 2: make sure it gets there
    return Math.abs(dx) < 900 ? Math.sign(dx) || 1 : 0;
  }

  let jumpAt = 0, climbTo = null, waitDir = 1;
  const center = s => s.x0 < -1000 ? null : (s.x0 + s.x1) / 2 - 32;
  function goTo(s, on, now) {
    // climb one step at a time (a jump lifts ~118 px), or walk off the nearer edge to go down
    if (s.y < on.y - 2) {
      const steps = surfaces().filter(t => t.y < on.y - 2 && t.y >= on.y - JUMP + 4);
      const step = steps.sort((a, b) => Math.abs(center(a) - center(s)) - Math.abs(center(b) - center(s)))[0];
      if (!step) { steer(0); return; }
      const sx = center(step), dir = Math.sign(sx - P.x);
      const edge = dir > 0 ? on.x1 - 64 - P.x : P.x - on.x0;
      if (Math.abs(P.x - sx) <= 24) { steer(0); if (now > jumpAt) { jump(); jumpAt = now + 0.4; climbTo = sx; } }
      else { steer(dir); if (on.y < level.floorY && edge < 14 && now > jumpAt) { jump(); jumpAt = now + 0.4; climbTo = sx; } }
    } else {
      const sx = center(s);
      if (sx !== null && P.x + 64 > s.x0 && P.x < s.x1 && on.y < s.y) {
        // it's below us: step off toward its middle
        steer((on.x1 - P.x) < (P.x - on.x0 + 64) ? 1 : -1);
      } else if (sx !== null) steer(Math.sign(sx - P.x) || 1);
      else steer((on.x1 - P.x) < (P.x - on.x0 + 64) ? 1 : -1);
    }
  }
  function fight(now) {
    if (S.gameState !== 'playing' || S.getBossTriggered()) { release(); return; }
    // anything in line: face it, stand still and fire
    const now_ = alive().map(e => ({ e, dir: inLine(e) })).filter(o => o.dir);
    if (now_.length) {
      const d = now_.sort((a, b) => Math.abs(a.e.x - P.x) - Math.abs(b.e.x - P.x))[0].dir;
      if (P.facing !== d) { steer(d); return; }
      steer(0); fire(); return;
    }
    if (fireUp) fire();
    const on = standing();
    if (!on) { const ax = climbTo; steer(ax !== null && Math.abs(P.x - ax) > 12 ? Math.sign(ax - P.x) : 0); return; }
    climbTo = null;
    // the surface whose firing line meets the most carpshits soonest
    const opts = [];
    for (const e of alive()) for (const s of surfaces()) {
      const g = s.y - GUN, [a, b] = band(e);
      if (g >= a && g <= b) opts.push({ e, s, cost: (s === on ? 0 : 150 + Math.abs(s.y - on.y) * 2 + (center(s) === null ? 0 : Math.abs(center(s) - P.x))) + Math.abs(e.x - P.x) * 0.3 });
    }
    opts.sort((a, b) => a.cost - b.cost);
    const best = opts[0];
    if (best && best.s === on) {
      // wait for it, facing it
      const d = Math.sign(best.e.x - P.x) || 1;
      if (P.facing !== d) steer(d); else steer(0);
      return;
    }
    // something a jump from here can reach, close by: jump at it
    const jumpable = alive().filter(e => { const [a, b] = band(e); return on.y - GUN > b && on.y - GUN - JUMP + 10 < a && Math.abs(e.x - P.x) < 240; })[0];
    if (jumpable && now > jumpAt) {
      const d = Math.sign(jumpable.x - P.x) || 1;
      if (P.facing !== d) { steer(d); return; }
      steer(0); jump(); jumpAt = now + 1.2; return;
    }
    if (best) goTo(best.s, on, now); else steer(0);
  }
  D.items.fight = (it, now) => {
    if ((it.until && it._until(now, D)) || (it.dur !== undefined && now - it.t0 >= it.dur)) { release(); it.fin = true; return; }
    fight(now);
  };

  // ---------- the boss
  function bossBox() {
    const b = boss.__bossState, w = 100, h = 196;
    return { x: b.x + (boss.BOSS_WIDTH * b.scale - w) / 2, y: b.y + (boss.BOSS_HEIGHT * b.scale - h) / 2, w, h };
  }
  D.items.boss = (it, now) => {
    if ((it.until && it._until(now, D)) || (it.dur !== undefined && now - it.t0 >= it.dur)) { release(); it.fin = true; return; }
    if (!boss || !S.getBossBattleStarted() || S.gameState !== 'playing') { release(); return; }
    const b = bossBox(), mid = b.x + b.w / 2, dir = Math.sign(mid - (P.x + 32)) || 1;
    // keep some room: 260-420 px from him
    const dist = Math.abs(mid - (P.x + 32));
    if (dist < 260) steer(-dir); else if (dist > 420) steer(dir); else steer(0);
    if (P.facing !== dir && dist >= 260) steer(dir);
    // jump carpets coming at us
    const threat = projectiles.some(p => p.type === 'boss' && !p.hit && Math.abs(p.x + 64 - (P.x + 32)) < 150 && p.y + 100 > P.feetY - 96 && Math.sign(p.vx || -1) === Math.sign((P.x + 32) - (p.x + 64)));
    if (threat && P.grounded && now > jumpAt) { jump(); jumpAt = now + 0.3; }
    const y = P.y + 53;
    if (P.facing === dir && y > b.y && y < b.y + b.h) fire(); else if (fireUp) fire();
  };

  window.S_trig = () => S.getBossTriggered();
  window.__ugBattle = () => S.getBossBattleStarted();
  D.items.title = (it) => { tap('x'); it.fin = true; };
  D.items.hold = (it, now) => {
    for (const k of it.keys || []) key(k, true);
    if (now - it.t0 >= it.dur) { release(); it.fin = true; }
  };
})();
