// Unruggabull: RugCo Alley Remastered, the trailer's scripted player. Evaluated in the page after
// tools/trailer/harness.js; the game's classic scripts are globals (player, carpshits, platforms, __bossState...).
// It plays through a player's input: keys on a desktop (A/D, Space, F), or on a touch screen the d-pad and the
// fire side, as pointer events on the stage, so the touch controls light up as they would under a thumb.
// Plan items:
//   title                   a key press on the title (it starts the title music, as a first tap would)
//   go                      dismiss the controls screen
//   fight  {until | dur}    clear the alley: pick a carpshit, get onto a floor or platform where a jump lines the
//                           blaster up with it, face it and fire
//   boss   {until | dur}    fight the Rugfather: stay at range, jump his flaming carpets, fire when he's in line
// Staging, from `js` items: D.minHealth (health never drops below it), D.wave(n) (the next two unrugged start wave
// n; wave 6 brings the Rugfather), D.board(rows) (clears on this device's board, the board shown when it's offline).
// The game's music is cut from every take: the trailer lays the theme in itself (music.py).
(() => {
  const D = window.__D;
  const W = () => document.getElementById('stage').clientWidth, H = () => document.getElementById('stage').clientHeight;
  for (const c of [bgMusic, titleMusic]) { try { c._gain.disconnect(); } catch (e) {} }

  // ---------- input
  D.touch = !!(navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches);
  const held = { l: false, r: false, u: false, d: false };
  let jumpHold = 0, fireUp = false;
  const stage = document.getElementById('stage');
  const ptr = (type, id, x, y) => stage.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y }));
  const ctl = () => { const u = Math.min(H(), W() * 0.6); return { pad: { x: 0.23 * u, y: H() - 0.3 * u, r: 0.19 * u }, fire: { x: W() - 0.23 * u, y: H() - 0.27 * u } }; };
  let padDown = false, padAt = null;
  function sync() {
    const dx = (held.r ? 1 : 0) - (held.l ? 1 : 0), dy = (held.d ? 1 : 0) - (held.u ? 1 : 0);
    if (D.touch) {
      const c = ctl().pad;
      if (!dx && !dy) { if (padDown) { ptr('pointerup', 1, padAt[0], padAt[1]); padDown = false; } return; }
      const n = Math.hypot(dx, dy), at = [c.x + dx / n * c.r * 0.8, c.y + dy / n * c.r * 0.8];
      if (!padDown) { ptr('pointerdown', 1, at[0], at[1]); padDown = true; } else if (at[0] !== padAt[0] || at[1] !== padAt[1]) ptr('pointermove', 1, at[0], at[1]);
      padAt = at;
    } else {
      const k = (key, on) => document.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { key, bubbles: true, cancelable: true }));
      for (const [key, on] of [['d', held.r], ['a', held.l], [' ', held.u], ['s', held.d]]) if (!!keys[key] !== on) k(key, on);
    }
  }
  function steer(dir) { held.r = dir > 0; held.l = dir < 0; sync(); }
  function jump() { held.u = true; jumpHold = 3; sync(); }
  function fire() {
    // one shot per press: down this frame, up the next
    if (D.touch) { const f = ctl().fire; ptr(fireUp ? 'pointerup' : 'pointerdown', 2, f.x, f.y); }
    else document.dispatchEvent(new KeyboardEvent(fireUp ? 'keyup' : 'keydown', { key: 'f', bubbles: true, cancelable: true }));
    fireUp = !fireUp;
  }
  function release() { held.l = held.r = held.u = held.d = false; sync(); if (fireUp) fire(); }
  D.stage.push(() => { if (jumpHold && --jumpHold === 0) { held.u = false; sync(); } });

  D.start = () => document.querySelector('#menu [data-act="play"]').click();
  D.state = () => ({ gs: gameState, kills: killCount, wave: difficultyLevel, hp: player.health, x: Math.round(player.x), y: Math.round(player.feetY),
    boss: Math.max(0, __bossState.hp), phase: __bossState.phase });
  D.onItem = () => release();

  // ---------- markers
  const prev = { gs: '', kills: 0, wave: 1, hp: 20, triggered: false, battle: false, phase: 0, dying: false, end: true };
  D.watch.push(() => {
    if (gameState !== prev.gs) { D.mark('gs:' + gameState); prev.gs = gameState; }
    if (killCount > prev.kills) D.mark('kill');
    prev.kills = killCount;
    if (difficultyLevel !== prev.wave) { D.mark('wave:' + difficultyLevel); prev.wave = difficultyLevel; }
    if (player.health < prev.hp) D.mark('hit');
    prev.hp = player.health;
    if (getBossTriggered() && !prev.triggered) { D.mark('boss:trigger'); prev.triggered = true; }
    if (getBossBattleStarted() && !prev.battle) { D.mark('boss:battle'); prev.battle = true; }
    if (__bossState.phase !== prev.phase) { D.mark('boss:phase' + __bossState.phase); prev.phase = __bossState.phase; }
    if (__bossState.dying && !prev.dying) { D.mark('boss:dying'); prev.dying = true; }
    const end = document.getElementById('end').hidden;
    if (end !== prev.end) { D.mark(end ? 'end:hidden' : 'end:shown'); prev.end = end; }
  });
  // voice lines and the big sounds, by the clip that plays them
  const named = { letsGoSound: 'lets-go', flawlessVictorySound: 'flawless', garageDoorSound: 'garage', evilLaughSfx: 'laugh', helloUnruggabullSfx: 'hello',
    wovenIntoRugSfx: 'woven', challengeMeSfx: 'challenge', heatThingsUpSfx: 'heat', muhahahaSfx: 'muhahaha', rugfatherWeaveRemembersSfx: 'weave' };
  for (const [v, n] of Object.entries(named)) {
    const c = window.__trailerEval(v), play = c.play.bind(c);
    c.play = () => { D.mark('say:' + n); return play(); };
  }
  for (const [i, n] of [[0, 'oh-yeaaa'], [1, 'permanence']]) { const c = difficultyIncreaseSounds[i], play = c.play.bind(c); c.play = () => { D.mark('say:' + n); return play(); }; }

  D.stage.push(() => { if (D.minHealth && player.health < D.minHealth) player.health = D.minHealth; });
  // jump to wave n: the next two unrugged start it. With `kills`, the count jumps too, so a run staged to the boss
  // reads like a whole one on the end card (75 unrugged clear the five waves).
  D.wave = (n, kills) => { if (kills) { killCount = kills; prev.kills = kills; } setDifficultyLevel(n - 1); setNextPhaseKillCount(killCount + 2); };
  // The board is offline in a take (the capture reaches no network), so it says so above the rows; the trailer
  // shows the board as it looks online.
  const quiet = document.createElement('style'); quiet.textContent = '#end .lb-standing{display:none}'; document.head.append(quiet);
  D.board = rows => { localStorage.setItem('unruggabull-remastered-clears-' + BOARD, JSON.stringify(rows)); };

  // ---------- where the blaster can reach
  const GUN = 43, JUMP = 118;
  const level = levels_default[getCurrentLevelKey()];
  const surfaces = () => [{ y: level.floorY, x0: -1e4, x1: 1e4 }].concat(platforms.map(p => ({ y: p.y, x0: p.x, x1: p.x + p.width })));
  const standing = () => surfaces().find(s => Math.abs(player.feetY - s.y) < 1 && player.grounded && player.x + 64 > s.x0 && player.x < s.x1);
  const band = e => [e.y + 8, e.y + 42];
  const alive = () => carpshits.concat(lowerCarpshits).filter(e => e.alive && !e.falling && e.x > -40 && e.x < 980);
  function inLine(e) {
    const y = player.y + 53, [a, b] = band(e);
    if (y < a || y > b) return 0;
    const dx = e.x + 32 - (player.x + 32);
    return Math.abs(dx) < 900 ? Math.sign(dx) || 1 : 0;
  }
  let jumpAt = 0, climbTo = null;
  const center = s => s.x0 < -1000 ? null : (s.x0 + s.x1) / 2 - 32;
  function goTo(s, on, now) {
    if (s.y < on.y - 2) {
      const steps = surfaces().filter(t => t.y < on.y - 2 && t.y >= on.y - JUMP + 4);
      const step = steps.sort((a, b) => Math.abs(center(a) - center(s)) - Math.abs(center(b) - center(s)))[0];
      if (!step) { steer(0); return; }
      const sx = center(step), dir = Math.sign(sx - player.x);
      const edge = dir > 0 ? on.x1 - 64 - player.x : player.x - on.x0;
      if (Math.abs(player.x - sx) <= 24) { steer(0); if (now > jumpAt) { jump(); jumpAt = now + 0.4; climbTo = sx; } }
      else { steer(dir); if (on.y < level.floorY && edge < 14 && now > jumpAt) { jump(); jumpAt = now + 0.4; climbTo = sx; } }
    } else {
      const sx = center(s);
      if (sx !== null && player.x + 64 > s.x0 && player.x < s.x1 && on.y < s.y) steer((on.x1 - player.x) < (player.x - on.x0 + 64) ? 1 : -1);
      else if (sx !== null) steer(Math.sign(sx - player.x) || 1);
      else steer((on.x1 - player.x) < (player.x - on.x0 + 64) ? 1 : -1);
    }
  }
  function fightStep(now) {
    if (gameState !== 'playing' || getBossTriggered()) { release(); return; }
    const lined = alive().map(e => ({ e, dir: inLine(e) })).filter(o => o.dir);
    if (lined.length) {
      const d = lined.sort((a, b) => Math.abs(a.e.x - player.x) - Math.abs(b.e.x - player.x))[0].dir;
      if (player.facing !== d) { steer(d); return; }
      steer(0); fire(); return;
    }
    if (fireUp) fire();
    const on = standing();
    if (!on) { const ax = climbTo; steer(ax !== null && Math.abs(player.x - ax) > 12 ? Math.sign(ax - player.x) : 0); return; }
    climbTo = null;
    const opts = [];
    for (const e of alive()) for (const s of surfaces()) {
      const g = s.y - GUN, [a, b] = band(e);
      if (g >= a && g <= b) opts.push({ e, s, cost: (s === on ? 0 : 150 + Math.abs(s.y - on.y) * 2 + (center(s) === null ? 0 : Math.abs(center(s) - player.x))) + Math.abs(e.x - player.x) * 0.3 });
    }
    opts.sort((a, b) => a.cost - b.cost);
    const best = opts[0];
    if (best && best.s === on) { const d = Math.sign(best.e.x - player.x) || 1; steer(player.facing !== d ? d : 0); return; }
    const jumpable = alive().filter(e => { const [a, b] = band(e); return on.y - GUN > b && on.y - GUN - JUMP + 10 < a && Math.abs(e.x - player.x) < 240; })[0];
    if (jumpable && now > jumpAt) {
      const d = Math.sign(jumpable.x - player.x) || 1;
      if (player.facing !== d) { steer(d); return; }
      steer(0); jump(); jumpAt = now + 1.2; return;
    }
    if (best) goTo(best.s, on, now); else steer(0);
  }
  const ends = (it, now) => (it.until && it._until(now, D)) || (it.dur !== undefined && now - it.t0 >= it.dur);
  D.items.fight = (it, now) => { if (ends(it, now)) { release(); it.fin = true; return; } fightStep(now); };

  // ---------- the Rugfather
  function bossBox() {
    const b = __bossState, w = 100, h = 196;
    return { x: b.x + (BOSS_WIDTH2 * b.scale - w) / 2, y: b.y + (BOSS_HEIGHT2 * b.scale - h) / 2, w, h };
  }
  D.items.boss = (it, now) => {
    if (ends(it, now)) { release(); it.fin = true; return; }
    if (!getBossBattleStarted() || gameState !== 'playing') { release(); return; }
    const b = bossBox(), mid = b.x + b.w / 2, dir = Math.sign(mid - (player.x + 32)) || 1;
    const dist = Math.abs(mid - (player.x + 32));
    if (dist < 260) steer(-dir); else if (dist > 420) steer(dir); else steer(0);
    if (player.facing !== dir && dist >= 260) steer(dir);
    const threat = projectiles.some(p => p.type === 'boss' && !p.hit && Math.abs(p.x + 64 - (player.x + 32)) < 150 && p.y + 100 > player.feetY - 96 && Math.sign(p.vx || -1) === Math.sign((player.x + 32) - (p.x + 64)));
    if (threat && player.grounded && now > jumpAt) { jump(); jumpAt = now + 0.3; }
    const y = player.y + 53;
    if (player.facing === dir && y > b.y && y < b.y + b.h) fire(); else if (fireUp) fire();
  };

  D.items.title = it => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true })); it.fin = true; };
  D.items.go = it => {
    if (D.touch) { ptr('pointerdown', 9, W() * 0.5, H() * 0.4); ptr('pointerup', 9, W() * 0.5, H() * 0.4); }
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
    it.fin = true;
  };
  window.__ug = { battle: () => getBossBattleStarted(), triggered: () => getBossTriggered() };
})();
