// Stick Army squad life: earned names and ranks, wounded crew, and the one-bed field hospital.
// Classic script; load before game.js. game.js calls StickArmySquad(world) once with the same world object it gives
// units.js (constants, helpers, and live values such as S through getters).
var StickArmySquad = function (w) {
  'use strict';
  var GROUND = w.GROUND, INK = w.INK, BLUE = w.BLUE, RED = w.RED, HAT = w.HAT, PAPER = w.PAPER;
  var L = w.L, SP = w.SP, ink = w.ink, pen = w.pen, emit = w.emit;
  function addText(s, x, y, c, sz, kind) { w.addText(s, x, y, c, sz, kind); }

  // ---------- names and ranks ----------
  // Rookies are nameless. Standing at the end of a wave counts as a wave served; enough waves earn a name and a
  // stripe, then more stripes. Each stripe adds a little health and a quicker trigger.
  var RANKS = [
    { waves: 0, short: '', title: 'rookie' },
    { waves: 3, short: 'Pfc.', title: 'Private First Class' },
    { waves: 6, short: 'Cpl.', title: 'Corporal' },
    { waves: 10, short: 'Sgt.', title: 'Sergeant' }
  ];
  var RANK = { HP: 0.5, FIRE: 0.92 };
  var NAMES = ['Doodle', 'Squiggle', 'Scribbles', 'Inky', 'Smudge', 'Sketch', 'Nib', 'Graphite', 'Crayon', 'Margins',
    'Stubby', 'Pip', 'Biro', 'Quill', 'Tally', 'Dash', 'Dot', 'Scrawl', 'Loopy', 'Zigzag', 'Chalky', 'Noodle', 'Blot',
    'Jot', 'Hatch', 'Swoosh', 'Twig', 'Pencils', 'Lefty', 'Ruler'];
  function rankName(r) { return r.rank ? RANKS[r.rank].short + ' ' + r.name : 'a rookie'; }
  // Kill counts (r.kills) come from each soldier's own shots, credited in game.js.
  function killsText(n) { n = n || 0; return n + (n === 1 ? ' kill' : ' kills'); }
  // "Sgt. Doodle (12 waves, 140 kills)" for the pause card, the fallen list and the roll call.
  function record(f) { return f.name + ' (' + f.waves + (f.waves === 1 ? ' wave, ' : ' waves, ') + killsText(f.kills) + ')'; }
  // Names come from the run seed and the recruit's id, never from a game stream, so they can't change outcomes.
  function pickName(r) {
    var S = w.S, h = (Math.imul(w.seed ^ 0x9e3779b9, 31) + Math.imul(r.id, 2654435761)) >>> 0;
    for (var k = 0; k < NAMES.length; k++) {
      var name = NAMES[(h + k) % NAMES.length];
      if (!S.usedNames[name]) { S.usedNames[name] = true; return name; }
    }
    return NAMES[h % NAMES.length] + ' ' + (r.id % 90 + 10);
  }
  function serveWave(news) {
    var S = w.S;
    S.recruits.forEach(function (r) {
      if (r.dead || r.down) return;
      r.waves = (r.waves || 0) + 1;
      var next = RANKS[(r.rank || 0) + 1];
      if (!next || r.waves < next.waves) return;
      r.rank = (r.rank || 0) + 1; r.hp += RANK.HP;
      if (!r.name) { r.name = pickName(r); news.push('A rookie earns a name: ' + rankName(r) + ', ' + killsText(r.kills) + '.'); }
      else news.push(r.name + ' makes ' + RANKS[r.rank].title + ', ' + killsText(r.kills) + '.');
      addText(rankName(r) + '!' + (r.kills ? ' ' + killsText(r.kills) : ''), r.x, GROUND - 60, BLUE, 22);
      w.say('yes sir!', r.id, false, 1.1);
      emit('rank_up', { rank: r.rank, type: r.type });
    });
  }

  // ---------- wounded crew ----------
  // At zero health a recruit falls wounded instead of dying. Any more damage finishes him, and landers and tanks
  // won't step around him. A medic or a pizza gets him back up. When the wave clears, the field hospital's one bed
  // goes to the most decorated wounded soldier (first down on a tie); everyone else still down is lost.
  function knockDown(r, cause) {
    var S = w.S;
    r.down = true; r.hp = 0; r.downAt = S.t; r.downCause = cause || 'unknown'; r.role = 'down'; r.tx = r.x;
    addText(r.name ? r.name + ' is down!' : 'man down!', r.x, GROUND - 52, BLUE, 20);
    emit('recruit_down', { type: r.type, cause: r.downCause, rank: r.rank || 0 });
    w.say('medic!', r.id);
  }
  function standUp(r, by) {
    r.down = false; r.hp = Math.max(r.hp, 1); r.role = 'shoot';
    addText('back up!', r.x, GROUND - 52, BLUE, 20);
    emit('recruit_revived', { by: by, rank: r.rank || 0 });
    w.say('thanks!', r.id);
  }
  // The squad cheers a cleared wave, a few voices one after another.
  function cheer(line) {
    w.S.recruits.filter(function (r) { return !r.dead && !r.down; }).slice(0, 4).forEach(function (r, i) { w.say(line, r.id, false, 0.25 + i * 0.22); });
  }
  function fallen(r) { if (r.name) w.S.fallen.push({ name: rankName(r), waves: r.waves || 0, kills: r.kills || 0 }); }

  // ---------- field hospital ----------
  var TENT = { x: 318, hw: 21, h: 30 };
  function careAtWaveEnd(news) {
    var S = w.S;
    // Back from the tent: a patient who sat out a whole wave rejoins at full health.
    if (S.bed && S.bed.since < S.wave) {
      var back = S.bed.r; S.bed = null;
      back.down = false; back.role = 'shoot'; back.hp = w.crewMax(back); back.x = back.tx = back.homeX;
      S.recruits.push(back);
      news.push((back.name ? rankName(back) : 'The rookie') + ' is back from the tent.');
      emit('recruit_back', { rank: back.rank || 0 });
    }
    var down = S.recruits.filter(function (r) { return !r.dead && r.down; })
      .sort(function (a, b) { return (b.rank || 0) - (a.rank || 0) || a.downAt - b.downAt; });
    down.forEach(function (r, i) {
      if (i === 0 && S.mods.hospital && !S.bed) {
        S.recruits.splice(S.recruits.indexOf(r), 1);
        S.bed = { r: r, since: S.wave };
        news.push((r.name ? rankName(r) : 'A rookie') + ' made it to the tent.');
        addText('to the tent!', r.x, GROUND - 52, BLUE, 20);
        emit('recruit_saved', { rank: r.rank || 0 });
      } else {
        r.dead = true; fallen(r);
        news.push((r.name ? rankName(r) : 'A rookie') + " didn't make it.");
        emit('recruit_lost', { type: r.type, cause: r.downCause, rank: r.rank || 0, wounds: true });
      }
    });
  }
  function bedSlot() { var S = w.S; return S.bed ? S.bed.r.slot : -1; }

  // ---------- drawing ----------
  // Stripes: small yellow chevrons on the shoulder, one per rank.
  function chevrons(x, y, rank) {
    if (!rank) return;
    var G = w.G;
    G.beginPath();
    for (var i = 0; i < rank; i++) { var cy = y + i * 3.2; L(x - 3, cy + 2, x, cy, 0.1); L(x, cy, x + 3, cy + 2, 0.1); }
    ink(INK, 3.2); G.stroke(); ink(HAT, 1.6); G.stroke();
  }
  function drawTent() {
    var S = w.S, G = w.G;
    if (!S.mods.hospital) return;
    pen(9060);
    var x = TENT.x, hw = TENT.hw, top = GROUND - TENT.h;
    G.beginPath(); G.moveTo(x - hw, GROUND); G.lineTo(x, top); G.lineTo(x + hw, GROUND); G.closePath(); G.fillStyle = PAPER; G.fill();
    G.beginPath(); SP([x - hw, GROUND, x, top, x + hw, GROUND], false, 0.5); L(x, top, x - 4, GROUND, 0.3); L(x, top, x + 4, GROUND, 0.3); ink(INK, 2.2); G.stroke();
    G.beginPath(); L(x, top, x, top - 9, 0.2); ink(INK, 1.6); G.stroke();
    G.fillStyle = PAPER; G.fillRect(x, top - 9, 10, 7);
    G.beginPath(); L(x + 5, top - 8, x + 5, top - 3); L(x + 2.5, top - 5.5, x + 7.5, top - 5.5); ink(RED, 1.8); G.stroke();
    if (S.bed) {
      // The patient rests in the doorway with his head bandaged.
      G.beginPath(); G.arc(x - 6, GROUND - 5, 3.6, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill(); ink(BLUE, 2); G.stroke();
      G.beginPath(); L(x - 2.5, GROUND - 4, x + 9, GROUND - 3, 0.2); ink(BLUE, 2.2); G.stroke();
      G.beginPath(); L(x - 9.5, GROUND - 6.5, x - 2.5, GROUND - 5.5, 0.1); ink(PAPER, 2); G.stroke();
    }
  }

  return { RANKS: RANKS, RANK: RANK, NAMES: NAMES, rankName: rankName, killsText: killsText, record: record, serveWave: serveWave, knockDown: knockDown, standUp: standUp, cheer: cheer,
    fallen: fallen, TENT: TENT, careAtWaveEnd: careAtWaveEnd, bedSlot: bedSlot, chevrons: chevrons, drawTent: drawTent };
};
