// Writes p(Loom)'s roof fight music, Saga II and its heavy version, and the ending's music into
// site/unruggabull-ii/music-roof.js as the plain track objects roofA, roofAHeavy and ending (B and C, the earlier candidates, are left as they are).
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

// ---------------- The ending: one piece from the snap to the dead eye (owner, Oct 17) ----------------
// Picked on the music page ("One piece, uplift then silence", ending-plan.md). It starts as the dawn opens, the moment
// the threads snap: the snap's own chord rings, the choir lands on D major and a voice rises over it; it dies away
// into about a second of silence; the choir swells back in on a low D. Then Saga II's solo (the heavy track's SOLO,
// its tapping, bass and choir, no drums) at 113 instead of 170, its first bar coming up from a quarter of its volume;
// a step down a second before the dead eye (the bass holds, the tapping halves); and into the eye the instruments drop
// out one by one, to one clean D ringing as the blue light comes up. Then nothing (a silent bar it rests on).
// Its timing is the ending's: the bridge's two bars at 95.5 last the roof's dawn (5.03 s, ROOF.time.dawn and a step),
// and the solo's four bars at 113 last the ending's first two shots (8.5 s, SHOTS in ending.js). Change those and
// this with them.
const ENDING_BPM = 113, BRIDGE_BPM = 95.5;
const solo = plain(heavy.patterns.SOLO.channels);
const rests = n => Array.from({ length: n }, () => '.');
const chordAt = (notes, len, vol, extra) => Object.assign({ note: notes[0], chord: notes.slice(1), len, vol, gate: .98 }, extra);
const as = (ch, stem, notes) => Object.assign({}, ch, { stem }, notes ? { notes } : {});
// the solo's channels for the bars listed (0-3)
function soloBars(list) {
  const pick1 = ch => { const c = Object.assign({}, ch); c.notes = typeof c.notes === 'string' ? list.map(i => c.notes.split('|')[i]).join(' | ') : list.map(i => c.notes[i]); return c; };
  return { tap: as(pick1(solo.tap), 'lead'), bass: as(pick1(solo.bass), 'bass'), choirA: as(pick1(solo.choirA), 'choir'), choirB: as(pick1(solo.choirB), 'choir') };
}
// the first bar comes up note by note, from a quarter of the channel's volume to all of it
function easeIn(ch) {
  const c = Object.assign({}, ch), b = c.notes.split('|').map(s => s.trim().split(/\s+/));
  b[0] = b[0].map((n, i) => n === '-' || n === '.' ? n : { note: n, vol: +(c.vol * (.25 + .75 * i / 15)).toFixed(4) });
  c.notes = b[0].concat(...b.slice(1));
  return c;
}
const S3 = soloBars([0, 1, 2]); S3.tap = easeIn(S3.tap); S3.bass = easeIn(S3.bass);
// the step down: the second half of the last bar, the bass held and the tapping in eighths
const B4 = soloBars([3]);
B4.tap.notes = 'A4 E5 C#6 E5 A5 E5 C#6 E5 A4 . C#6 . E6 . C#6 .';
B4.bass.notes = 'A1 - A1 - A1 - A1 - A1 - - - - - - -';
// into the eye: the bass's last note at the cut, the choir lets go a second in, the tapping thins, one clean D on the blue light
const dropChoir = ch => as(ch, 'choir', [chordAt(['A3', 'D4', 'F4'], 8)].map(e => (delete e.vol, e)).concat(rests(24)));
const DROP = {
  tap: as(solo.tap, 'lead', 'D5 . F6 . E6 . F6 . D5 . . . E6 . . . | A5 . . F5 . . . . . . . . . . . .'),
  bass: as(solo.bass, 'bass', 'D2 - - - . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  choirA: dropChoir(solo.choirA), choirB: dropChoir(solo.choirB),
  ping: { stem: 'lead', wave: 'pulse', duty: .125, vol: .045, envelope: { attack: .004, decay: .15, sustain: .4, release: .6 }, echo: { delay: .27, feedback: .35, repeats: 3 },
    notes: rests(23).concat(['D6', '-', '-', '-', '-'], rests(4)) }
};
// the bridge over the dawn: the uplift, the silence, the swell
const pad = detune => ({ stem: 'choir', wave: 'sawtooth', vol: .03, detune, envelope: { attack: .03, decay: 1, sustain: .6, release: .9 },
  notes: [chordAt(['D3', 'A3', 'D4', 'F#4'], 8, .036)].concat(rests(12), [chordAt(['D3', 'D4', 'F#4'], 12, .02, { envelope: { attack: 1.2, decay: .3, sustain: .9, release: .9 } })]) });
const BRIDGE = {
  choirA: pad(-6), choirB: pad(6),
  rise: { stem: 'choir', wave: 'sawtooth', vol: .02, detune: 3, envelope: { attack: .08, decay: .6, sustain: .7, release: .9 },
    notes: [{ note: 'A4', len: 2 }, { note: 'D5', len: 2 }, { note: 'F#5', len: 4 }].concat(rests(24)) },
  drone: { stem: 'bass', wave: 'triangle', vol: .11, envelope: { attack: 1.2, decay: .2, sustain: 1, release: .5 }, notes: rests(20).concat([{ note: 'D2', len: 12, gate: .98 }]) }
};
const ending = {
  name: 'The ending (snap to the dead eye)', key: 'Dm', bpm: ENDING_BPM, swing: 0, loop: 4, order: ['BR', 'S3', 'B4', 'DROP', 'R'], stems: ['lead', 'bass', 'choir'],
  patterns: {
    BR: { bars: 2, bpm: BRIDGE_BPM, channels: BRIDGE }, S3: { bars: 3, channels: S3 }, B4: { bars: 1, channels: B4 }, DROP: { bars: 2, channels: DROP },
    R: { bars: 1, channels: { rest: { stem: 'lead', wave: 'triangle', vol: 0, notes: rests(16).join(' ') } } }
  }
};

const src = fs.readFileSync(FILE, 'utf8'), window = {};
new Function('window', src)(window);
const all = Object.assign({ roofA: plain(fight), roofAHeavy: plain(heavy) }, window.UnrugRoofMusic, { roofA: plain(fight), roofAHeavy: plain(heavy), ending: plain(ending) });
const head = `// p(Loom)'s roof music. Plain track objects; load before audio.js.
// roofA/roofAHeavy is Saga II, the chosen fight track, and ending the ending's music (the snap to the dead eye), both
// generated by tools/unruggabull-ii/roof-music.js (edit it there).
// roofB/roofC are the earlier candidates, kept for comparing with #music=b or #music=c.
`;
// Saga II's note lists go on one line each, so the file stays readable; B and C keep their layout.
const NOTES = '@@notes@@', compact = v => JSON.stringify(v, (k, x) => k === 'notes' && Array.isArray(x) ? NOTES + JSON.stringify(x) : x, 2)
  .replace(new RegExp('"' + NOTES + '(.*)"', 'g'), (_, j) => JSON.parse('"' + j + '"'));
const body = Object.entries(all).map(([id, t]) => '  ' + JSON.stringify(id) + ': ' + (/^roofA|^ending$/.test(id) ? compact(t) : JSON.stringify(t, null, 2)).replace(/\n/g, '\n  ')).join(',\n');
fs.writeFileSync(FILE, head + 'window.UnrugRoofMusic = {\n' + body + '\n};\n');
console.log('wrote', FILE, Object.keys(all).join(', '));
