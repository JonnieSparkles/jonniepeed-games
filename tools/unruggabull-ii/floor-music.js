// Writes the 13th Floor's music, "Shuffle, cold open", into site/unruggabull-ii/music-floor.js as the plain track
// objects floorHall, floorCopy and floorShred (window.UnrugFloorMusic, loaded before audio.js).
// Usage, from the repo root: node tools/unruggabull-ii/floor-music.js
// The office muzak's tune and chords (Em, Am, D, G, C, F#m7b5, B7, Em) played as a swung boogie-rock shuffle.
// One track grows through the floor by stems instead of cutting between tracks:
//   drums, bass (bass and distorted guitar), lead: Accounts Payable; + harmony (twin lead): moving day;
//   + power (arpeggio, double kicks): All Staff; dark alone: lights out (the muzak thin and slow over the PA);
//   heavy: SHRED-O's low octave lead.
// floorHall opens with two bars of the actual office muzak at 120 BPM (once), then the band at 150.
// floorCopy is a step up at 158; floorShred is a step higher again at 168, heavier.
// Ported from the 13th Floor test page (its r4Hall, r2Copy and r2Shred). Edit here, run it, and the game picks it up.
'use strict';
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '../../site/unruggabull-ii/music-floor.js');

const NI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const M = n => { if (typeof n === 'number') return n; const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) throw new Error('bad note ' + n); return (+m[3] + 1) * 12 + NI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const nm = m => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const bars = s => s.split('|').map(b => b.trim().split(/\s+/));
const check = (s, what) => { bars(s).forEach((b, i) => { if (b.length !== 16) throw new Error(what + ' bar ' + (i + 1) + ' has ' + b.length); }); return s; };
const isNote = t => !['-', '.', '|'].includes(t) && !/^[kKsShHcTr]$/.test(t);
const shift = (s, k) => check(s, 'line').split(/\s+/).map(t => isNote(t) ? nm(M(t) + k) : t).join(' ');
const rest = n => Array(n).fill(Array(16).fill('.').join(' ')).join(' | ');
const rep = (s, n) => Array(n).fill(s).join(' | ');
// Move a melody n steps along a scale (a harmony a third below is -2).
function harm(s, n, tonic, scale) {
  return check(s, 'line').split(/\s+/).map(t => {
    if (!isNote(t)) return t;
    let m = M(t), back = 0;
    while (scale.indexOf(((m - back - tonic) % 12 + 12) % 12) < 0) back++;
    m -= back; const rel = m - tonic, oct = Math.floor(rel / 12), deg = scale.indexOf(((rel % 12) + 12) % 12);
    const tot = oct * 7 + deg + n, o2 = Math.floor(tot / 7), d2 = ((tot % 7) + 7) % 7;
    return nm(tonic + o2 * 12 + scale[d2]);
  }).join(' ');
}
const E_MIN = [0, 2, 3, 5, 7, 8, 10], E = 52;   // E3 as the scale's anchor
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], m7b5: [0, 3, 6, 10] };
function chord(name) { const m = /^([A-G][#b]?)(.*)$/.exec(name); const pc = ((M(m[1] + '4') % 12) + 12) % 12; return { pc, iv: QUAL[m[2]] }; }
// Bass per bar: R root, O octave, F fifth, T third, M muted root, - hold, . rest.
function bassLine(chords, pat, k, low = 36) {
  return chords.map((c, i) => { const ch = chord(c), r = low + ch.pc + k; const p = (Array.isArray(pat) ? pat[i % pat.length] : pat).split(' ');
    return p.map(t => t === 'R' || t === 'M' ? nm(r) : t === 'O' ? nm(r + 12) : t === 'F' ? nm(r + 7) : t === 'T' ? nm(r + ch.iv[1]) : t).join(' '); }).join(' | ');
}
function arp(chords, k, base = 60, mode = 'up', per = 16) {
  return chords.map(c => { const ch = chord(c); let r = base + ch.pc + k; if (ch.pc >= 7) r -= 12;
    let tones = ch.iv.map(v => r + v).concat([r + 12]); if (mode === 'updown') tones = tones.concat(tones.slice(1, -1).reverse());
    return Array.from({ length: per }, (_, i) => nm(tones[i % tones.length])).join(' '); }).join(' | ');
}
function pads(chords, k, base = 60) {
  return chords.map(c => { const ch = chord(c); let r = base + ch.pc + k; if (ch.pc >= 7) r -= 12; const t = ch.iv.map(v => r + v);
    return { note: nm(t[0]), chord: t.slice(1).map(nm), len: 16 }; });
}
// A power-chord chug on the root (root, fifth, octave) through the overdrive.
function chug(chords, pat, k, vol, low = 40) {
  const out = [];
  chords.forEach((c, i) => { const ch = chord(c); let r = low + ((ch.pc - 4 + 12) % 12) + k;
    for (const t of (Array.isArray(pat) ? pat[i % pat.length] : pat).split(' ')) out.push(t === '-' || t === '.' ? t : { note: nm(r), chord: [nm(r + 7), nm(r + 12)], gate: t === 'M' ? .32 : .95, vol: t === 'M' ? vol * .85 : vol }); });
  return out;
}

// The office muzak: its chords and its tune (the cold open and lights out play it as it is).
const MZ = ['Em7', 'Am7', 'D7', 'Gmaj7', 'Cmaj7', 'F#m7b5', 'B7', 'Em7'];
const MZ_LEAD = 'B5 - - - G5 - - - E5 - - - F#5 - G5 - | A5 - - - - - - - E5 - - - C5 - - - | F#5 - - - E5 - D5 - C5 - - - A4 - - - | B4 - - - - - - - D5 - - - F#5 - - - | E5 - - - G5 - - - B5 - - - A5 - G5 - | A5 - - - - - - - C6 - - - A5 - - - | D#5 - - - F#5 - - - A5 - - - F#5 - D#5 - | E5 - - - - - - - - - - - . . . .';
// The same tune and chords as rock.
const RK = ['Em', 'Am', 'D', 'G', 'C', 'F#m7b5', 'B7', 'Em'];
const RK_LEAD = 'B5 - B5 - G5 - - E5 - - E5 - F#5 - G5 - | A5 - - - A5 - C6 - B5 - A5 - E5 - C5 - | F#5 - F#5 - E5 - D5 - C5 - - A4 - - B4 C5 | D5 - - - B4 - - - D5 - G5 - B5 - D6 - | E6 - - - C6 - - - G5 - E5 - G5 - C6 - | A5 - - - - - C6 - A5 - F#5 - E5 - D#5 - | D#5 - F#5 - A5 - B5 - D#6 - - - C6 - B5 - | E6 - - - - - - - B5 - G5 - E5 - - -';
// Half time: each step held twice as long (the first four bars become eight).
const halfTime = s => check(s, 'line').split(/\s+/).filter(t => t !== '|').flatMap(t => t === '.' ? ['.', '.'] : [t, '-']).reduce((out, t, i) => out + (i && i % 16 === 0 ? ' | ' : i ? ' ' : '') + t, '');
const firstBars = (s, n) => s.split('|').slice(0, n).map(b => b.trim()).join(' | ');
// Lights out: the muzak on the PA, thin and slow, with a heartbeat.
function paMuzak(k) {
  return {
    paLead: { stem: 'dark', wave: 'triangle', vol: .11, gate: .9, notes: halfTime(firstBars(shift(MZ_LEAD, k), 4)), vibrato: { rate: 4.5, depth: .014, delay: .1 } },
    paPad: { stem: 'dark', wave: 'sine', vol: .03, gate: .98, notes: pads(MZ, k, 60), envelope: { attack: .1, decay: .2, sustain: .6, release: .3 } },
    paBass: { stem: 'dark', wave: 'triangle', vol: .2, gate: .7, notes: bassLine(MZ, 'R . . . . . . . F . . . . . . .', k) },
    paBeat: { stem: 'dark', wave: 'noise', vol: .3, notes: rep('k . . k . . . . . . . . . . . .', 8) }
  };
}
// The shuffle, k semitones up from E minor; heavy for SHRED-O.
function shuffle(k, heavy) {
  const lead = shift(RK_LEAD, k);
  const bar = heavy ? 'K . h K S . h K K . h K S . S K' : 'K . h . S . h K K . h . S . h h';
  const fill = heavy ? 'K K K K S S S S S S S S S S S S' : 'K . h . S . h K S . S . S S S S';
  const ch = {
    drums: { stem: 'drums', wave: 'noise', vol: heavy ? .62 : .55, notes: [bar, bar, bar, fill, bar, bar, bar, fill].join(' | ') },
    crash: { stem: 'drums', wave: 'noise', vol: .45, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => i % 4 ? rest(1) : 'c . . . . . . . . . . . . . . .').join(' | ') },
    bass: { stem: 'bass', wave: 'triangle', vol: .3, gate: .75, notes: bassLine(RK, 'R . T . F . O . F . T . R . F .', k) },
    gtr: { stem: 'bass', wave: 'pulse', duty: .25, drive: true, notes: chug(RK.map(c => c.replace(/m7b5|7/, m => m === 'm7b5' ? 'm' : '')), 'O - M . M . O - M . M . O - M M', k, heavy ? .046 : .04) },
    lead: { stem: 'lead', wave: heavy ? 'sawtooth' : 'pulse', duty: .5, vol: heavy ? .06 : .085, gate: .92, notes: lead, vibrato: { rate: 6, depth: .012, delay: .1 }, echo: { delay: .15, feedback: .2, repeats: 1 } },
    harmony: { stem: 'harmony', wave: 'pulse', duty: .25, vol: .04, gate: .92, notes: harm(lead, -2, E + k, E_MIN), vibrato: { rate: 6, depth: .012, delay: .1 } },
    arp: { stem: 'power', wave: 'pulse', duty: .125, vol: .026, gate: .5, notes: arp(RK, k, 72, 'updown') },
    kicks: { stem: 'power', wave: 'noise', vol: .3, notes: rep('K . . K . . K . K . . K . . K .', 8) }
  };
  if (heavy) ch.low = { stem: 'heavy', wave: 'sawtooth', vol: .03, gate: .92, detune: 12, notes: shift(lead, -12) };
  Object.assign(ch, paMuzak(k));
  return { bars: 8, channels: ch };
}
// Straight rock (All Staff, Rush Hour): the same tune and chords as the shuffle, driving eighths, no swing.
function rock(k, heavy) {
  const lead = shift(RK_LEAD, k);
  const bar = heavy ? 'K K h K S . h K K K h K S . h K' : 'K . h K S . h K K . h K S . h h';
  const fill = heavy ? 'K K K K S S S S S S S S S S S S' : 'K . h K S . h K S . S S S S S S';
  const ch = {
    drums: { stem: 'drums', wave: 'noise', vol: heavy ? .62 : .55, notes: [bar, bar, bar, fill, bar, bar, bar, fill].join(' | ') },
    crash: { stem: 'drums', wave: 'noise', vol: .45, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => i % 4 ? rest(1) : 'c . . . . . . . . . . . . . . .').join(' | ') },
    bass: { stem: 'bass', wave: 'triangle', vol: .3, gate: .75, notes: bassLine(RK, 'R R O R R R O R R R O R R O F O', k) },
    gtr: { stem: 'bass', wave: 'pulse', duty: .25, drive: true, notes: chug(RK.map(c => c.replace(/m7b5|7/, m => m === 'm7b5' ? 'm' : '')), heavy ? 'O - M M M - M M O - M M M - M M' : 'O - M M M . M M O - M M M . O -', k, heavy ? .046 : .04) },
    lead: { stem: 'lead', wave: heavy ? 'sawtooth' : 'pulse', duty: .5, vol: heavy ? .06 : .085, gate: .92, notes: lead, vibrato: { rate: 6, depth: .012, delay: .1 }, echo: { delay: .15, feedback: .2, repeats: 1 } },
    harmony: { stem: 'harmony', wave: 'pulse', duty: .25, vol: .04, gate: .92, notes: harm(lead, -2, E + k, E_MIN), vibrato: { rate: 6, depth: .012, delay: .1 } },
    arp: { stem: 'power', wave: 'pulse', duty: .125, vol: .026, gate: .5, notes: arp(RK, k, 72, 'updown') },
    kicks: { stem: 'power', wave: 'noise', vol: .3, notes: rep('K . K K K . K K K . K K K . K K', 8) }
  };
  Object.assign(ch, paMuzak(k));
  return { bars: 8, channels: ch };
}
// The twin-guitar break: the office muzak's own tune (it sits on the same chords) as the lead, a third under it on the
// harmony, with a crash on every bar. The copy room and All Staff go A, B, A, B, so the tune doesn't just loop.
function twinBreak(p, k) {
  const lead = shift(MZ_LEAD, k), c = p.channels;
  c.lead = Object.assign({}, c.lead, { notes: lead, vol: c.lead.vol * 1.05 });
  c.harmony = Object.assign({}, c.harmony, { notes: harm(lead, -2, E + k, E_MIN), vol: .05 });
  c.crash = Object.assign({}, c.crash, { notes: rep('c . . . . . . . . . . . . . . .', 8) });
  return p;
}
// Rush Hour: heavy straight rock up a fourth, the tune an octave down on the saw, a crash every bar and an alarm
// (a two-note siren on the pulse, an octave and a fifth over the chord's root) on the power stem.
function rush(k) {
  const p = rock(k, true), c = p.channels, lead = shift(RK_LEAD, k - 12);
  c.lead = Object.assign({}, c.lead, { notes: lead });
  c.harmony = Object.assign({}, c.harmony, { notes: harm(lead, -2, E + k, E_MIN), vol: .045 });
  c.crash = Object.assign({}, c.crash, { notes: rep('c . . . . . . . . . . . . . . .', 8) });
  c.alarm = { stem: 'power', wave: 'pulse', duty: .125, vol: .03, gate: .9, notes: RK.map(ch => { const r = 64 + chord(ch).pc + k - (chord(ch).pc + k >= 7 ? 12 : 0);
    return [r + 12, '-', '-', '-', r + 19, '-', '-', '-', r + 12, '-', '-', '-', r + 19, '-', '-', '-'].map(t => typeof t === 'number' ? nm(t) : t).join(' '); }).join(' | ') };
  c.kicks = Object.assign({}, c.kicks, { notes: rep('K K K K K K K K K K K K K K K K', 8), vol: .26 });
  return p;
}
// Scale a whole track's levels (the copy room and SHRED-O sit louder than the hall).
function louder(t, f) {
  for (const pat of Object.values(t.patterns)) for (const c of Object.values(pat.channels)) {
    if (c.vol != null) c.vol *= f;
    if (Array.isArray(c.notes)) c.notes = c.notes.map(n => n && typeof n === 'object' && n.vol != null ? Object.assign({}, n, { vol: n.vol * f }) : n);
  }
  return t;
}
const track = (name, bpm, swing, patterns, order, stems) => ({ name, key: 'Em', bpm, swing, loop: 0, order, stems, patterns });
const HALL = ['drums', 'bass', 'lead'], ALL = HALL.concat('harmony', 'power'), HEAVY = ALL.concat('heavy');

const tracks = {
  floorHall: track('The 13th Floor · Shuffle', 150, .22, { A: shuffle(0, false) }, ['A'], HALL),
  floorStaff: louder(track('The 13th Floor · All Staff', 160, 0, { A: rock(2, false), B: twinBreak(rock(2, false), 2) }, ['A', 'B'], ALL), 1.1),
  floorRush: louder(track('The 13th Floor · Rush Hour', 172, 0, { A: rush(5) }, ['A'], HEAVY), 1.3),
  floorCopy: louder(track('The 13th Floor · Shuffle · Copy Room', 158, .22, { A: shuffle(2, false), B: twinBreak(shuffle(2, false), 2) }, ['A', 'B'], ALL), 1.15),
  floorShred: louder(track('The 13th Floor · Shuffle · SHRED-O', 168, .18, { A: shuffle(3, true) }, ['A'], HEAVY), 1.4)
};

// After SHRED-O (the album page's handoffs, owner's picks Oct 17).
// floorEnd: one last chord the moment SHRED-O goes down, in its key (G) at its overtime tempo: a G power chord on the
// saw, the bass, a kick and a crash, ringing a bar and a half; then a silent bar it rests on.
const steps = n => Array(n).fill('.').join(' ');   // n silent steps
const ring = { attack: .004, decay: .45, sustain: .5, release: .5 };
tracks.floorEnd = { name: 'The 13th Floor · SHRED-O goes down', key: 'Em', bpm: 178, swing: 0, loop: 1, order: ['E', 'Z'], stems: ['all'], patterns: {
  E: { bars: 2, channels: {
    gtr: { stem: 'all', wave: 'sawtooth', drive: true, vol: .05, envelope: ring, notes: [{ note: 'G2', chord: ['D3', 'G3'], len: 24, gate: 1 }].concat(steps(8).split(' ')) },
    bass: { stem: 'all', wave: 'triangle', vol: .3, envelope: ring, notes: [{ note: 'G1', len: 24, gate: 1 }].concat(steps(8).split(' ')) },
    drums: { stem: 'all', wave: 'noise', vol: .55, notes: 'K ' + steps(31) },
    crash: { stem: 'all', wave: 'noise', vol: .45, notes: 'c ' + steps(31) }
  } },
  Z: { bars: 1, channels: { rest: { stem: 'all', notes: steps(16) } } }
} };
// floorPA: the office PA comes back on under the clear card and into the lobby: the hall's own PA muzak (its lights-out
// voice: lead, pad and bass), with a soft brush, swung like the hall. Bar 5 is its C chord.
const pa = JSON.parse(JSON.stringify(tracks.floorHall.patterns.A.channels)), paCh = {};
for (const k of ['paLead', 'paPad', 'paBass']) paCh[k] = Object.assign(pa[k], { stem: 'pa' });
paCh.paBrush = { stem: 'pa', wave: 'noise', vol: .16, notes: Array(8).fill('. . h . . . h . . . h . . . h .').join(' | ') };
tracks.floorPA = { name: 'The 13th Floor · The office PA', key: 'Em', bpm: 150, swing: .22, loop: 0, order: ['A'], stems: ['pa'], patterns: { A: { bars: 8, channels: paCh } } };

// One line per note list, so the file stays readable.
const NOTES = '@@notes@@', compact = v => JSON.stringify(v, (k, x) => k === 'notes' ? NOTES + JSON.stringify(x) : x, 2)
  .replace(new RegExp('"' + NOTES + '(.*)"', 'g'), (_, j) => JSON.parse('"' + j + '"'));
const head = `// The 13th Floor's music, "Shuffle, cold open". Plain track objects; load before audio.js.
// Generated by tools/unruggabull-ii/floor-music.js (edit it there and rerun). floorHall grows by stems through the
// hall (drums, bass, lead; + harmony; + power; dark alone for lights out); floorCopy and floorShred follow it.
// floorEnd is SHRED-O's last chord, floorPA the office PA under the clear card.
`;
const body = Object.entries(tracks).map(([id, t]) => '  ' + JSON.stringify(id) + ': ' + compact(t).replace(/\n/g, '\n  ')).join(',\n');
fs.writeFileSync(FILE, head + 'window.UnrugFloorMusic = {\n' + body + '\n};\n');
console.log('wrote', FILE, Object.keys(tracks).join(', '));
