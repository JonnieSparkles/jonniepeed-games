// Writes p(Loom)'s roof fight music, Saga II and its heavy version, into site/unruggabull-ii/music-roof.js
// as the plain track objects roofA and roofAHeavy (B and C, the earlier candidates, are left as they are).
// Usage, from the repo root: node tools/unruggabull-ii/roof-music.js
// The tune is written here as short strings: power-chord riffs, lead lines, drum bars and choir chords,
// which the helpers below expand into the sequencer's note lists. Edit here, run it, and the game picks it up.
'use strict';
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '../../site/unruggabull-ii/music-roof.js');

const { M, nm, barsOf, parseGtr, gtr, bass, line, rest, harm, setBar, shift, arp, drums, crash, pattern, track } = require('./music-helpers.js');

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
