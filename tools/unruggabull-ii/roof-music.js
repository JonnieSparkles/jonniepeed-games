// Writes p(Loom)'s roof fight music, Saga II and its heavy version, into site/unruggabull-ii/music-roof.js
// as the plain track objects roofA and roofAHeavy (B and C, the earlier candidates, are left as they are).
// Usage, from the repo root: node tools/unruggabull-ii/roof-music.js
// The tune is written here as short strings: power-chord riffs, lead lines, drum bars and choir chords,
// which the helpers below expand into the sequencer's note lists. Edit here, run it, and the game picks it up.
'use strict';
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '../../site/unruggabull-ii/music-roof.js');

const NI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const M = n => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) throw new Error('bad note ' + n); return (+m[3] + 1) * 12 + NI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const nm = m => NAMES[m % 12] + (Math.floor(m / 12) - 1);
const barsOf = s => s.split('|').map(b => b.trim().split(/\s+/));
const check = (bars, what) => bars.forEach((b, i) => { if (b.length !== 16) throw new Error(what + ' bar ' + (i + 1) + ' has ' + b.length + ' steps'); });

// Guitar: each bar starts "ROOT:", then 16 steps. x = palm-muted chug on the root, O = open power chord on the root,
// a note name = open power chord on that note, mNOTE = muted on that note, - hold, . rest.
function parseGtr(s) {
  return barsOf(s).map(b => { const root = b[0].replace(':', ''); return { root, steps: b.slice(1) }; });
}
function gtr(s, o = {}) {
  const vol = o.vol || .042, mute = o.mute || .036, out = [], bars = parseGtr(s);
  check(bars.map(b => b.steps), 'guitar');
  for (const b of bars) for (const t of b.steps) {
    if (t === '-' || t === '.') { out.push(t); continue; }
    const muted = t === 'x' || /^m[A-G]/.test(t), n = t === 'x' || t === 'O' ? b.root : t.replace(/^m/, ''), r = M(n);
    out.push({ note: r, chord: [r + 7, r + 12], gate: muted ? .32 : .95, vol: muted ? mute : vol });
  }
  return out;
}
function bass(s) {
  const out = [], bars = parseGtr(s);
  for (const b of bars) for (const t of b.steps) {
    if (t === '-' || t === '.') { out.push(t); continue; }
    const muted = t === 'x' || /^m[A-G]/.test(t), n = t === 'x' || t === 'O' ? b.root : t.replace(/^m/, '');
    out.push({ note: M(n) - 12, gate: muted ? .4 : .92 });
  }
  return out;
}
const line = s => { check(barsOf(s), 'line'); return s; };
const rest = bars => Array(bars).fill(Array(16).fill('.').join(' ')).join(' | ');
// Move a melody n steps along D minor (a twin lead a third below is -2). Notes outside the scale snap down first.
const SCALE = [0, 2, 3, 5, 7, 8, 10];   // D minor, counted from D
function harm(s, n) {
  return line(s).split(/\s+/).map(t => {
    if (t === '-' || t === '.' || t === '|') return t;
    let m = M(t), pc = (m % 12 + 12) % 12, back = 0;
    while (SCALE.indexOf((pc - 2 - back + 24) % 12) < 0) back++;
    m -= back; const deg = SCALE.indexOf((m - 2 + 24) % 12), oct = Math.floor((m - 2) / 12);
    const tot = oct * 7 + deg + n, o2 = Math.floor(tot / 7), d2 = ((tot % 7) + 7) % 7;
    return nm(2 + o2 * 12 + SCALE[d2]);
  }).join(' ');
}
// Swap one bar of a line (for twin-lead bars over the A major chord, where the scale's C would clash with C#).
const setBar = (s, i, bar) => { const b = s.split('|').map(x => x.trim()); b[i] = bar; return line(b.join(' | ')); };
const shift = (s, k) => line(s).split(/\s+/).map(t => t === '-' || t === '.' || t === '|' ? t : nm(M(t) + k)).join(' ');
// Retro synth arpeggio: one chord per bar (space-separated notes), 16 sixteenths a bar.
function arp(chords, mode = 'up') {
  return chords.map(c => {
    let tones = c.split(' ').map(M); tones = tones.concat([tones[0] + 12]);
    const seq = mode === 'updown' ? tones.concat(tones.slice(1, -1).reverse()) : tones;
    return Array.from({ length: 16 }, (_, i) => nm(seq[i % seq.length])).join(' ');
  }).join(' | ');
}
const drums = (bars, fill, last) => { const b = Array(bars).fill(fill); if (last) b[bars - 1] = last; check(b.map(x => x.split(' ')), 'drums'); return b.join(' | '); };
const crash = bars => Array.from({ length: bars }, (_, i) => i === 0 ? 'c . . . . . . . . . . . . . . .' : '. . . . . . . . . . . . . . . .').join(' | ');

// One pattern: guitar riff, lead line, and the layers. Heavy swaps the lead to a saw and adds a detuned second saw.
function pattern(heavy, p) {
  const bars = p.bars || (p.gtr ? parseGtr(p.gtr).length : barsOf(p.tap).length), ch = {};
  ch.drums = { stem: 'drums', wave: 'noise', vol: heavy ? .62 : .5, notes: heavy && p.heavyDrums ? p.heavyDrums : p.drums };
  ch.crash = { stem: 'drums', wave: 'noise', vol: heavy ? .5 : .4, notes: p.crash || crash(bars) };
  if (p.gtr) ch.gtr = { stem: 'bass', wave: 'pulse', duty: .25, drive: true, notes: gtr(p.gtr, heavy ? { vol: .048, mute: .042 } : {}) };
  // A tapped single-note guitar riff (Coheed style), distorted like the chords.
  if (p.tap) ch.tap = { stem: 'bass', wave: 'pulse', duty: .25, drive: true, vol: heavy ? .056 : .05, gate: .8, notes: line(p.tap) };
  ch.bass = { stem: 'bass', wave: 'triangle', vol: heavy ? .3 : .27, notes: p.bassLine ? line(p.bassLine) : bass(p.gtr) };
  const lead = p.lead || rest(bars);
  ch.lead = heavy
    ? { stem: 'lead', wave: 'sawtooth', vol: .05, gate: .92, notes: line(lead), vibrato: { rate: 6, depth: .008, delay: .1 }, echo: { delay: .16, feedback: .22, repeats: 2 } }
    : { stem: 'lead', wave: 'pulse', duty: .5, vol: .075, gate: .92, notes: line(lead), vibrato: { rate: 5.5, depth: .007, delay: .12 }, echo: { delay: .17, feedback: .22, repeats: 2 } };
  ch.harmony = { stem: 'harmony', wave: 'pulse', duty: .25, vol: heavy ? .045 : .042, gate: .92, notes: p.harmony || rest(bars), vibrato: { rate: 5.5, depth: .007, delay: .12 } };
  ch.synth = { stem: 'power', wave: 'pulse', duty: .125, vol: p.synthVol || .022, gate: .55, notes: p.synth || rest(bars), echo: p.synthEcho ? { delay: .12, feedback: .3, repeats: 1 } : undefined };
  if (p.kicks) ch.kicks = { stem: 'power', wave: 'noise', vol: heavy ? .38 : .32, notes: p.kicks };
  // The tune doubled an octave down (a bigger chorus), and a clean synthwave saw bass.
  if (p.leadLow) ch.leadLow = { stem: 'lead', wave: 'pulse', duty: .25, vol: heavy ? .045 : .04, gate: .92, notes: shift(lead, -12) };
  if (p.synthBass) ch.sbass = { stem: 'bass', wave: 'sawtooth', vol: heavy ? .045 : .04, gate: .6, envelope: { attack: .002, decay: .05, sustain: .5, release: .03 }, notes: line(p.synthBass) };
  // A clean, echoing arpeggio guitar (intros), and the souls' choir: held chords on two detuned voices that swell in.
  if (p.clean) ch.clean = { stem: 'bass', wave: 'pulse', duty: .125, vol: .05, gate: .7, notes: line(p.clean), echo: { delay: .2, feedback: .35, repeats: 3 } };
  if (p.choir) for (const [k, d] of [['choirA', -10], ['choirB', 9]]) ch[k] = {
    stem: p.choirStem || 'power', wave: 'sawtooth', vol: (heavy ? .022 : .018) * (p.choirLevel || 1), detune: d,
    envelope: { attack: .35, decay: .2, sustain: .85, release: .4 }, vibrato: { rate: 4.8, depth: .006, delay: .2 },
    notes: p.choir.map(c => { const n = c.split(' '); return { note: n[0], chord: n.slice(1), len: 16, gate: .98 }; })
  };
  if (heavy) ch.lead2 = { stem: 'heavy', wave: 'sawtooth', vol: .028, gate: .92, detune: 14, notes: line(lead) };
  return { bars, channels: ch };
}
function track(name, bpm, order, pats, heavy) {
  const patterns = {};
  for (const k of Object.keys(pats)) patterns[k] = pattern(heavy, pats[k]);
  return {
    name: name + (heavy ? ' (heavy)' : ''), key: 'Dm', bpm, swing: 0, loop: 0, order,
    stems: ['drums', 'bass', 'lead', 'harmony', 'power'].concat(heavy ? ['heavy'] : []),
    patterns
  };
}

// ---------------- Saga II: built around the choir and the bells ----------------
// Coheed style again, made to lead into the choir roar. A clean echoing intro with the souls' choir swelling,
// a syncopated verse riff, then an eight-bar chorus whose tune keeps reaching for D, F and A, with the choir answering.
// Round 3 brings the choir into the fight; after the fusion it sings with the beam's choir.
const S2_VERSE = 'K . h . S . h K . K h . S . h .';
const S2_HEAVY = 'K K K K S K K K K K K K S K K K';
const s2Verse = 'A4 - - - D5 - - - E5 - F5 - - - E5 - | D5 - - - - - - - . . F5 - E5 - D5 - | D5 - - - Bb4 - - - G4 - - - Bb4 - D5 - | C#5 - - - - - - - E5 - - - A4 - - -';
const s2Chorus = 'D6 - - - - - C6 - D6 - - - F6 - - - | C6 - - - - - - - A5 - - - C6 - - - | E6 - - - - - D6 - E6 - - - G6 - - - | D6 - - - - - - - A5 - - - D6 - - - | D6 - - - - - C6 - D6 - - - F6 - - - | F6 - - - E6 - - - C6 - - - A5 - - - | Bb5 - - - - - A5 - G5 - - - D6 - - - | C#6 - - - - - - - E6 - - - - - - -';
const CHORUS_CHOIR = ['Bb3 D4 F4', 'A3 C4 F4', 'G3 C4 E4', 'A3 D4 F4', 'Bb3 D4 F4', 'A3 C4 F4', 'G3 Bb3 D4', 'A3 C#4 E4'];
const saga2 = {
  I: {
    bars: 4, bassLine: 'D2 - - - - - - - - - - - - - - - | Bb1 - - - - - - - - - - - - - - - | F2 - - - - - - - - - - - - - - - | C2 - - - - - - - A1 - - - - - - -',
    clean: arp(['D4 F4 A4', 'Bb3 D4 F4', 'F4 A4 C5', 'C4 E4 G4'], 'updown'),
    choir: ['A3 D4 F4', 'Bb3 D4 F4', 'A3 C4 F4', 'G3 C4 E4'], choirStem: 'bass',
    drums: 'h . . . h . . . h . . . h . . . | h . . . h . . . h . . . h . h . | T . . . T . . . T . T . T . T . | S . S . S . S . S S S S S S S S',
    heavyDrums: 'K . . . K . . . K . . . K . . . | K . . . K . . . K . K . K . K . | K . K . K . K . K K K K K K K K | S . S . S . S . S S S S S S S S',
    crash: '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'
  },
  V: {
    gtr: 'D3: O - - x x . O - - x x . O - O - | Bb2: O - - x x . O - - x x . O - O - | G2: O - - x x . O - - x x . O - O - | A2: O - - x x . O - - x x . x x x x',
    lead: s2Verse, harmony: setBar(harm(s2Verse, -2), 3, 'A4 - - - - - - - C#5 - - - E4 - - -'),
    drums: drums(4, S2_VERSE, 'K . h . S . h K . K S S S S S S'), heavyDrums: drums(4, S2_HEAVY, 'K K K K S K K K S S S S S S S S'),
    synth: arp(['D5 F5 A5', 'Bb4 D5 F5', 'G4 Bb4 D5', 'A4 C#5 E5']),
    choir: ['A3 D4 F4', 'Bb3 D4 F4', 'G3 Bb3 D4', 'A3 C#4 E4'], choirLevel: .7,
    kicks: drums(4, 'K K . . K K . . K K . . K K . .')
  },
  C: {
    gtr: 'Bb2: O - - - - - - - x x x x O - - - | F2: O - - - - - - - x x x x O - - - | C3: O - - - - - - - x x x x O - - - | D3: O - - - - - - - x x x x O - - - | Bb2: O - - - - - - - x x x x O - - - | F2: O - - - - - - - x x x x O - - - | G2: O - - - - - - - x x x x O - - - | A2: O - - - - - - - x x x x x x x x',
    lead: s2Chorus, leadLow: true,
    harmony: setBar(harm(s2Chorus, -2), 7, 'A5 - - - - - - - C#6 - - - - - - -'),
    drums: drums(8, 'K . h . h . h . S . h . K . h .', 'K . h . S . h . S . S . S S S S'),
    heavyDrums: drums(8, 'K K K K S . K K K K K K S . K K', 'K K K K S K K K S S S S S S S S'),
    crash: Array.from({ length: 8 }, () => 'c . . . . . . . . . . . . . . .').join(' | '),
    synth: arp(['Bb4 D5 F5', 'F4 A4 C5', 'C5 E5 G5', 'D5 F5 A5', 'Bb4 D5 F5', 'F4 A4 C5', 'G4 Bb4 D5', 'A4 C#5 E5'], 'updown'),
    choir: CHORUS_CHOIR, choirLevel: 1.2,
    kicks: drums(8, 'K . K K K . K K K . K K K . K K')
  },
  SOLO: {
    tap: 'D5 A5 F6 A5 E6 A5 F6 A5 D5 A5 F6 A5 E6 A5 D6 A5 | Bb4 F5 D6 F5 C6 F5 D6 F5 Bb4 F5 D6 F5 C6 F5 Bb5 F5 | G4 D5 Bb5 D5 A5 D5 Bb5 D5 G4 D5 Bb5 D5 A5 D5 G5 D5 | A4 E5 C#6 E5 A5 E5 C#6 E5 A4 E5 C#6 E5 E6 D6 C#6 A5',
    bassLine: 'D2 - D2 - D2 - D2 - D2 - D2 - D2 - D2 - | Bb1 - Bb1 - Bb1 - Bb1 - Bb1 - Bb1 - Bb1 - Bb1 - | G1 - G1 - G1 - G1 - G1 - G1 - G1 - G1 - | A1 - A1 - A1 - A1 - A1 - A1 - A1 - A1 -',
    choir: ['A3 D4 F4', 'Bb3 D4 F4', 'G3 Bb3 D4', 'A3 C#4 E4'],
    drums: drums(4, S2_HEAVY), heavyDrums: drums(4, S2_HEAVY), kicks: drums(4, 'K K K K K K K K K K K K K K K K')
  }
};


const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));
const fight = track('Saga II', 152, ['I', 'V', 'V', 'C'], pick(saga2, ['I', 'V', 'C']), false);
const heavy = track('Saga II', 170, ['C', 'V', 'SOLO', 'V', 'C'], pick(saga2, ['V', 'C', 'SOLO']), true);
// The sequencer reads plain data, so drop the helpers' undefined fields.
const plain = o => JSON.parse(JSON.stringify(o));

const src = fs.readFileSync(FILE, 'utf8'), window = {};
new Function('window', src)(window);
const all = Object.assign({ roofA: plain(fight), roofAHeavy: plain(heavy) }, window.UnrugRoofMusic, { roofA: plain(fight), roofAHeavy: plain(heavy) });
const head = `// p(Loom)'s roof music. Plain track objects; load before audio.js.
// roofA/roofAHeavy is Saga II, the chosen fight track, generated by tools/unruggabull-ii/roof-music.js (edit it there).
// roofB/roofC are the earlier candidates, kept for comparing with #music=b or #music=c.
`;
// Saga II's note lists go on one line each, so the file stays readable; B and C keep their layout.
const NOTES = '@@notes@@', compact = v => JSON.stringify(v, (k, x) => k === 'notes' && Array.isArray(x) ? NOTES + JSON.stringify(x) : x, 2)
  .replace(new RegExp('"' + NOTES + '(.*)"', 'g'), (_, j) => JSON.parse('"' + j + '"'));
const body = Object.entries(all).map(([id, t]) => '  ' + JSON.stringify(id) + ': ' + (/^roofA/.test(id) ? compact(t) : JSON.stringify(t, null, 2)).replace(/\n/g, '\n  ')).join(',\n');
fs.writeFileSync(FILE, head + 'window.UnrugRoofMusic = {\n' + body + '\n};\n');
console.log('wrote', FILE, Object.keys(all).join(', '));
