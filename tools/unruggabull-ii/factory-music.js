// Writes Floor 48's music candidates into site/unruggabull-ii/music-factory.js as plain track objects.
// Usage, from the repo root: node tools/unruggabull-ii/factory-music.js
// Each candidate is three tracks: an intro (the factory running, held while he walks in), the fight, and its heavy
// version (the last line, the collapse). Production Panic adds stems as lines go down: drums, bass, lead and the
// machine at FIGHT; harmony and power after the first line; the heavy version slams in after the second.
// The machine stem is the factory itself: a sixteenth-note sequencer and the clank of the presses, in every section.
'use strict';
const fs = require('fs'), path = require('path');
const { M, nm, barsOf, line, rest, harm, setBar, shift, arp, drums, crash, pattern } = require('./music-helpers.js');
const FILE = path.join(__dirname, '../../site/unruggabull-ii/music-factory.js');

// ---------- the factory's own layers ----------
// The sequencer: one pitch a sixteenth, short and bright, like a line counting parts.
const machineCh = (notes, vol = .028) => ({ stem: 'machine', wave: 'pulse', duty: .125, vol, gate: .4, notes: line(notes),
  envelope: { attack: .002, decay: .03, sustain: .4, release: .02 } });
// The presses: a tritone struck on a square wave and gone at once, so it rings like steel. 'X' strikes, '.' rests.
function clank(steps, hi = 'A6') {
  const lo = nm(M(hi) - 6);
  return { stem: 'machine', wave: 'square', vol: .022, gate: .3, envelope: { attack: .001, decay: .05, sustain: .06, release: .09 },
    notes: line(steps).split(/\s+/).filter(t => t !== '|').map(t => t === 'X' ? { note: hi, chord: [lo] } : t === 'x' ? { note: hi, chord: [lo], vol: .012 } : t) };
}
// Steam: the open hat, quieter, on the machine stem.
const steam = steps => ({ stem: 'machine', wave: 'noise', vol: .16, notes: line(steps) });
// Gang stabs: a short sawtooth chord, the floor's crew shouting along (on the power stem).
const stabs = (chords, steps) => ({ stem: 'power', wave: 'sawtooth', vol: .02, detune: 7, gate: .5,
  envelope: { attack: .004, decay: .08, sustain: .5, release: .05 },
  notes: barsOf(steps).flatMap((b, i) => b.map(t => t === 'O' ? { note: chords[i].split(' ')[0], chord: chords[i].split(' ').slice(1) } : t)) });
// The alarm: two notes a semitone apart, like the klaxon, high in the lead's range.
const siren = (hi, lo, bars) => line(Array(bars).fill([hi, '-', '-', '-', lo, '-', '-', '-', hi, '-', '-', '-', lo, '-', '-', '-'].join(' ')).join(' | '));
const bars = (n, s) => Array(n).fill(s).join(' | ');

function withFactory(heavy, p) {
  const out = pattern(heavy, p);
  if (p.machine) out.channels.machine = machineCh(p.machine, heavy ? .03 : .028);
  if (p.clank) out.channels.clank = clank(p.clank, p.clankHi);
  if (p.steam) out.channels.steam = steam(p.steam);
  if (p.stabs) out.channels.stabs = stabs(p.stabs[0], p.stabs[1]);
  if (p.sirenLead) out.channels.siren = { stem: heavy ? 'heavy' : 'power', wave: 'pulse', duty: .5, vol: .03, gate: .95, notes: p.sirenLead,
    vibrato: { rate: 9, depth: .012, delay: 0 } };
  return out;
}
function track(name, bpm, order, pats, heavy, extra = {}) {
  const patterns = {};
  for (const k of Object.keys(pats)) patterns[k] = withFactory(heavy, pats[k]);
  return Object.assign({ name: name + (heavy ? ' (heavy)' : ''), key: 'Dm', bpm, swing: 0, loop: 0, order,
    stems: ['drums', 'bass', 'lead', 'machine', 'harmony', 'power'].concat(heavy ? ['heavy'] : []), patterns }, extra);
}
// The intro: the factory alone, held until FIGHT. A drone under it so the room feels big.
function intro(name, bpm, p) {
  const t = track(name + ' intro', bpm, ['I'], { I: p }, false, { holdPattern: true, startPattern: 'I' });
  t.stems = ['machine', 'bass'];
  return t;
}
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));

// ================= A: Neon Works =================
// Neon (round 2's wild card, synthwave gone metal) moved into the factory: its verse and chorus as they were, a saw
// bass pumping in octaves, the line's sequencer and presses underneath, and a new alarm section where the lead
// becomes the klaxon. 150 BPM, heavy at 168.
const octs = (roots, steps = 16) => roots.map(r => Array.from({ length: steps }, (_, i) => nm(M(r) + (i % 2 ? 12 : 0))).join(' ')).join(' | ');
const N_BEAT = 'K . h . S . h . K . h K S . h .';
const N_HEAVY = 'K h K h S h K h K h K h S h K K';
const neonVerse = 'D5 - - - - - - - A5 - - - G5 - F5 - | F5 - - - - - E5 - D5 - - - C5 - D5 - | C5 - - - - - D5 - F5 - - - A5 - C6 - | Bb5 - - - A5 - - - G5 - - - E5 - - -';
const neonChorus = 'D6 - - - - - - - C6 - - - - - Bb5 - | C6 - - - - - - - D6 - C6 - G5 - - - | A5 - - - - - - - F6 - - - E6 - D6 - | C#6 - - - - - - - E6 - - - - - - -';
const N_SEQ = 'D3 D4 A3 D4 D3 D4 A3 D4 D3 D4 A3 D4 C4 D4 A3 F3';
const N_SEQ4 = ['D3 D4 A3 D4 D3 D4 A3 D4 D3 D4 A3 D4 C4 D4 A3 F3', 'Bb2 Bb3 F3 Bb3 Bb2 Bb3 F3 Bb3 Bb2 Bb3 F3 Bb3 A3 Bb3 F3 D3',
  'F3 F4 C4 F4 F3 F4 C4 F4 F3 F4 C4 F4 E4 F4 C4 A3', 'C3 C4 G3 C4 C3 C4 G3 C4 C3 C4 G3 C4 E4 C4 G3 E3'].join(' | ');
const N_CLANK = '. . . . X . . . . . . . X . . x';
const neonWorks = {
  I: {
    bars: 4, bassLine: 'D2 - - - - - - - - - - - - - - - | D2 - - - - - - - - - - - - - - - | Bb1 - - - - - - - - - - - - - - - | A1 - - - - - - - - - - - - - - -',
    machine: bars(4, N_SEQ), clank: bars(4, N_CLANK), steam: bars(3, '. . . . . . . . . . . . . . . .') + ' | . . . . . . . . . . . . H . . .',
    drums: rest(4), crash: rest(4)
  },
  A: {
    gtr: 'D3: O - x . x . x . O - x . x . x x | Bb2: O - x . x . x . O - x . x . x x | F2: O - x . x . x . O - x . x . x x | C3: O - x . x . x . O - x . C3 - - -',
    synthBass: octs(['D2', 'Bb1', 'F2', 'C2']), lead: neonVerse, harmony: harm(neonVerse, -2),
    drums: drums(4, N_BEAT, 'K . h . S . h . K . S S S S S S'), heavyDrums: drums(4, N_HEAVY, 'K K K K S K K K S S S S S S S S'),
    synth: arp(['D5 F5 A5', 'Bb4 D5 F5', 'F5 A5 C6', 'C5 E5 G5']), synthVol: .03, synthEcho: true,
    kicks: drums(4, 'K . . . K . . . K . . . K . . .'),
    machine: N_SEQ4, clank: bars(4, N_CLANK)
  },
  B: {
    gtr: 'Bb2: O - - - - - - - x x x x O - - - | C3: O - - - - - - - x x x x O - - - | D3: O - - - - - - - x x x x O - - - | A2: O - - - - - - - x x x x x x x x',
    synthBass: octs(['Bb1', 'C2', 'D2', 'A1']), lead: neonChorus, leadLow: true,
    harmony: setBar(harm(neonChorus, -2), 3, 'A5 - - - - - - - C#6 - - - - - - -'),
    drums: drums(4, N_BEAT, 'K . h . S . h . S . S . S S S S'), heavyDrums: drums(4, N_HEAVY, 'K K K K S K K K S S S S S S S S'),
    crash: bars(4, 'c . . . . . . . . . . . . . . .'),
    synth: arp(['Bb4 D5 F5', 'C5 E5 G5', 'D5 F5 A5', 'A4 C#5 E5'], 'updown'), synthVol: .03, synthEcho: true,
    kicks: drums(4, 'K . K . K . K . K . K . K . K .'),
    stabs: [['Bb3 D4 F4', 'C4 E4 G4', 'D4 F4 A4', 'A3 C#4 E4'], bars(4, 'O . . . . . . . . . . . O . . .')],
    machine: ['Bb2 Bb3 F3 Bb3 Bb2 Bb3 F3 Bb3 Bb2 Bb3 F3 Bb3 A3 Bb3 F3 D3', 'C3 C4 G3 C4 C3 C4 G3 C4 C3 C4 G3 C4 E4 C4 G3 E3',
      'D3 D4 A3 D4 D3 D4 A3 D4 D3 D4 A3 D4 C4 D4 A3 F3', 'A2 A3 E3 A3 A2 A3 E3 A3 A2 A3 E3 A3 C#4 A3 E3 C#3'].join(' | '),
    clank: bars(4, 'X . . . X . . . X . . . X . X .')
  },
  // The alarm: the riff climbs a semitone at a time over a D pedal and the lead is the klaxon (Production Panic).
  P: {
    gtr: 'D3: x x x x O - x x x x O - x x Eb3 - | D3: x x x x O - x x x x O - F3 - E3 - | D3: x x x x O - x x x x O - x x Eb3 - | D3: x x x x O - x x F3 - - - A3 - - -',
    synthBass: octs(['D2', 'D2', 'D2', 'D2']),
    lead: 'D6 - - - C#6 - - - D6 - - - C#6 - - - | D6 - - - C#6 - - - D6 - F6 - E6 - - - | D6 - - - C#6 - - - D6 - - - C#6 - - - | D6 - - - - - - - F6 - - - A6 - - -',
    harmony: 'A5 - - - G#5 - - - A5 - - - G#5 - - - | A5 - - - G#5 - - - A5 - C6 - Bb5 - - - | A5 - - - G#5 - - - A5 - - - G#5 - - - | A5 - - - - - - - C6 - - - E6 - - -',
    drums: drums(4, 'K . S . K . S . K . S . K . S .', 'K . S . K . S . S S S S S S S S'), heavyDrums: drums(4, 'K K S K K K S K K K S K K K S K', 'K K K K S K K K S S S S S S S S'),
    synth: arp(['D5 F5 Ab5', 'D5 F5 Ab5', 'D5 F5 Ab5', 'D5 F5 A5']), synthVol: .03,
    kicks: drums(4, 'K K K K K K K K K K K K K K K K'),
    machine: bars(4, 'D4 D5 D4 D5 Eb4 Eb5 D4 D5 D4 D5 D4 D5 F4 F5 E4 E5'), clank: bars(4, 'X . X . X . X . X . X . X . X .')
  },
  SOLO: {
    gtr: 'D3: O - x . x . x . O - x . x . x x | Bb2: O - x . x . x . O - x . x . x x | F2: O - x . x . x . O - x . x . x x | C3: O - x . x . x . O - x . C3 - - -',
    synthBass: octs(['D2', 'Bb1', 'F2', 'C2']),
    lead: 'D5 F5 A5 D6 F6 D6 A5 F5 D5 F5 A5 D6 F6 A6 F6 D6 | Bb4 D5 F5 Bb5 D6 Bb5 F5 D5 Bb4 D5 F5 Bb5 D6 F6 D6 Bb5 | F5 A5 C6 F6 C6 A5 F5 A5 C6 F6 A6 F6 C6 A5 F5 A5 | E5 G5 C6 E6 G6 E6 C6 G5 E6 - D6 - C6 - Bb5 -',
    drums: drums(4, N_HEAVY), heavyDrums: drums(4, N_HEAVY), synth: arp(['D5 F5 A5', 'Bb4 D5 F5', 'F5 A5 C6', 'C5 E5 G5']), synthVol: .03, synthEcho: true,
    kicks: drums(4, 'K . K . K . K . K . K . K . K .'),
    machine: N_SEQ4, clank: bars(4, N_CLANK)
  }
};

// ================= B: Assembly Line =================
// Industrial metal on chip: a half-time groove at 132 that lands like a press, low chugs grinding D against Eb, the
// sequencer up front, a lead that says little and means it, and a chorus the crew shouts along to. Heavy at 148.
const AL_SEQ = 'D4 D5 A4 D5 Eb5 D5 A4 D5 D4 D5 A4 D5 F5 D5 Eb5 D5';
const AL_BEAT = 'K . . . S . . K . K . . S . h .';
const AL_HEAVY = 'K K . K S . K K K K . K S . K K';
const alVerse = 'D5 - - - - - - - . . . . A4 - C5 - | D5 - - - Eb5 - - - D5 - - - C5 - A4 - | D5 - - - - - - - . . . . F5 - Eb5 - | D5 - - - - - E5 - F5 - - - - - - -';
const alChorus = 'F5 - - - - - - - D5 - - - F5 - - - | A5 - - - - - - - C6 - - - A5 - - - | G5 - - - - - - - E5 - - - C5 - - - | C#5 - - - - - - - E5 - - - A5 - - -';
const assembly = {
  I: {
    bars: 4, bassLine: 'D2 - - - - - - - - - - - - - - - | D2 - - - - - - - - - - - Eb2 - - - | D2 - - - - - - - - - - - - - - - | D2 - - - - - - - - - - - C2 - - -',
    machine: bars(4, AL_SEQ), clank: bars(4, 'X . . . . . . . . . X . . . . .'), steam: bars(4, '. . . . . . . . . . . . . . H .'),
    drums: rest(4), crash: rest(4)
  },
  A: {
    gtr: 'D3: x . x . x x . x . x O - - - Eb3 - | D3: x . x . x x . x . x O - - - C3 - | D3: x . x . x x . x . x O - - - Eb3 - | Bb2: O - - - - - C3 - - - D3 - - - - -',
    lead: alVerse, harmony: shift(alVerse, 7),
    drums: drums(4, AL_BEAT, 'K . . . S . . K S . S . S S S S'), heavyDrums: drums(4, AL_HEAVY, 'K K K K S K K K S S S S S S S S'),
    synth: arp(['D5 F5 A5', 'D5 F5 Ab5', 'D5 F5 A5', 'Bb4 D5 F5']), synthVol: .024,
    kicks: drums(4, 'K K . . K K . . K K . . K K . .'),
    machine: [AL_SEQ, AL_SEQ, AL_SEQ, 'Bb3 Bb4 F4 Bb4 C4 C5 G4 C5 D4 D5 A4 D5 F5 D5 Eb5 D5'].join(' | '),
    clank: bars(4, 'X . . . . . X . . . X . . . . .')
  },
  B: {
    gtr: 'Bb2: O - - - - - - - O - - - O - - - | F2: O - - - - - - - O - - - O - - - | C3: O - - - - - - - O - - - O - - - | A2: O - - - x x x x x x x x x x x x',
    lead: alChorus, leadLow: true, harmony: setBar(harm(alChorus, -2), 3, 'A4 - - - - - - - C#5 - - - E5 - - -'),
    drums: drums(4, 'K . . . S . . . K . K . S . . .', 'K . . . S . . . S . S . S S S S'), heavyDrums: drums(4, 'K K K K S K K K K K K K S K K K', 'K K K K S K K K S S S S S S S S'),
    crash: bars(4, 'c . . . . . . . . . . . . . . .'),
    synth: arp(['Bb4 D5 F5', 'F4 A4 C5', 'C5 E5 G5', 'A4 C#5 E5'], 'updown'), synthVol: .024,
    stabs: [['Bb3 D4 F4', 'A3 C4 F4', 'G3 C4 E4', 'A3 C#4 E4'], bars(4, 'O . . . . . . . O . . . O . . .')],
    machine: ['Bb3 Bb4 F4 Bb4 D5 Bb4 F4 Bb4 Bb3 Bb4 F4 Bb4 D5 Bb4 F4 Bb4', 'F3 F4 C4 F4 A4 F4 C4 F4 F3 F4 C4 F4 A4 F4 C4 F4',
      'C4 C5 G4 C5 E5 C5 G4 C5 C4 C5 G4 C5 E5 C5 G4 C5', 'A3 A4 E4 A4 C#5 A4 E4 A4 A3 A4 E4 A4 C#5 A4 E4 A4'].join(' | '),
    clank: bars(4, 'X . . . X . . . X . . . X . . .')
  },
  P: {
    gtr: 'D3: x x x x x x x x Eb3 - - - x x x x | D3: x x x x x x x x F3 - - - E3 - - - | D3: x x x x x x x x Eb3 - - - x x x x | D3: x x x x x x x x C3 - Bb2 - A2 - - -',
    lead: siren('D6', 'Eb6', 4),
    drums: drums(4, 'K . K . S . K . K . K . S . K .', 'K . K . S . K . S S S S S S S S'), heavyDrums: drums(4, 'K K K K S K K K K K K K S K K K'),
    synth: arp(['D5 F5 Ab5 B5', 'D5 F5 Ab5 B5', 'D5 F5 Ab5 B5', 'D5 F5 Ab5 B5']), synthVol: .026,
    kicks: drums(4, 'K K K K K K K K K K K K K K K K'),
    machine: bars(4, 'D4 Eb4 D4 Eb4 D5 Eb5 D5 Eb5 D4 Eb4 D4 Eb4 D5 Eb5 D5 Eb5'), clank: bars(4, 'X . . X . . X . . X . . X . X .')
  },
  SOLO: {
    tap: 'D5 A5 D6 A5 Eb6 A5 D6 A5 D5 A5 D6 A5 F6 A5 Eb6 A5 | D5 A5 D6 A5 Eb6 A5 D6 A5 D5 A5 D6 A5 C6 A5 Bb5 A5 | D5 A5 D6 A5 Eb6 A5 D6 A5 D5 A5 D6 A5 F6 A5 Eb6 A5 | Bb4 F5 Bb5 F5 C5 G5 C6 G5 D5 A5 D6 A5 F6 E6 D6 A5',
    bassLine: bars(3, 'D2 - D2 - D2 - D2 - D2 - D2 - D2 - D2 -') + ' | Bb1 - Bb1 - C2 - C2 - D2 - D2 - D2 - D2 -',
    drums: drums(4, AL_HEAVY), heavyDrums: drums(4, AL_HEAVY), kicks: drums(4, 'K K K K K K K K K K K K K K K K'),
    machine: bars(4, AL_SEQ), clank: bars(4, 'X . . . X . . . X . . . X . . .')
  }
};

// ================= C: Gallop Line =================
// Gallop (round 1's maybe for the roof) set running down the line: galloping chugs at 172, the hook built on the bells
// (D, F, A), the sequencer and presses keeping time, the alarm as a breakdown. Heavy at 194.
const G_ROCK = 'K . h h S . h h K . K h S . h h';
const G_HEAVY = 'K K K K S K K K K K K K S K K K';
const G_GALLOP = 'K . K K K . K K K . K K K . K K';
const G_SEQ = 'D4 . D4 D4 A4 . A4 A4 D5 . D5 D5 C5 . A4 A4';
const gallopLine = {
  I: {
    bars: 4, bassLine: 'D2 - - - - - - - - - - - - - - - | D2 - - - - - - - - - - - - - - - | D2 - - - - - - - - - - - - - - - | D2 - - - - - - - A1 - - - - - - -',
    machine: bars(4, G_SEQ), clank: bars(4, 'X . . . . . . . X . . . . . . .'), steam: bars(4, '. . . . . . . . . . . . . . H .'),
    drums: rest(4), crash: rest(4)
  },
  A: {
    gtr: 'D3: O . x x x . x x O . x x x . x x | Bb2: O . x x x . x x O . x x x . x x | C3: O . x x x . x x O . x x x . x x | A2: O . x x x . x x O - - - Bb2 - C3 -',
    lead: 'A4 - D5 - F5 - - - E5 - D5 - E5 - F5 - | D5 - - - - - - - . . A4 - D5 - F5 - | G5 - - - F5 - E5 - F5 - - - E5 - C5 - | E5 - - - - - - - . . C#5 - E5 - A5 -',
    drums: drums(4, G_ROCK), heavyDrums: drums(4, G_HEAVY),
    synth: arp(['D5 F5 A5', 'Bb4 D5 F5', 'C5 E5 G5', 'A4 C#5 E5']),
    kicks: drums(4, G_GALLOP),
    machine: ['D4 . D4 D4 A4 . A4 A4 D5 . D5 D5 C5 . A4 A4', 'Bb3 . Bb3 Bb3 F4 . F4 F4 Bb4 . Bb4 Bb4 A4 . F4 F4',
      'C4 . C4 C4 G4 . G4 G4 C5 . C5 C5 Bb4 . G4 G4', 'A3 . A3 A3 E4 . E4 E4 A4 . A4 A4 G4 . E4 E4'].join(' | '),
    clank: bars(4, 'X . . . . . . . X . . . . . . .')
  },
  B: {
    gtr: 'G2: O . x x x . x x O . x x x . x x | A2: O . x x x . x x O . x x x . x x | Bb2: O . x x x . x x O . x x x . x x | C3: O - - - O - - - x x x x x x x x',
    lead: 'A5 - - - D6 - - - F6 - - - E6 - D6 - | E6 - - - - - - - C#6 - - - A5 - - - | D6 - - - - - - - F6 - - - D6 - Bb5 - | C6 - - - E6 - - - G6 - - - - - - -', leadLow: true,
    drums: drums(4, G_ROCK, 'K . h h S . h h S . S S S S S S'), heavyDrums: drums(4, G_HEAVY, 'K K K K S K K K S S S S S S S S'),
    synth: arp(['G4 Bb4 D5', 'A4 C#5 E5', 'Bb4 D5 F5', 'C5 E5 G5']),
    kicks: drums(4, G_GALLOP),
    stabs: [['G3 Bb3 D4', 'A3 C#4 E4', 'Bb3 D4 F4', 'C4 E4 G4'], bars(4, 'O . . . . . . . O . . . . . . .')],
    machine: ['G3 . G3 G3 D4 . D4 D4 G4 . G4 G4 F4 . D4 D4', 'A3 . A3 A3 E4 . E4 E4 A4 . A4 A4 G4 . E4 E4',
      'Bb3 . Bb3 Bb3 F4 . F4 F4 Bb4 . Bb4 Bb4 A4 . F4 F4', 'C4 . C4 C4 G4 . G4 G4 C5 . C5 C5 Bb4 . G4 G4'].join(' | '),
    clank: bars(4, 'X . . . X . . . X . . . X . . .')
  },
  P: {
    gtr: 'D3: O - - - . . x x . x . . Eb3 - - - | D3: O - - - . . x x . x x . F3 - - - | D3: O - - - . . x x . x . . Eb3 - - - | D3: O - - - x . x . x x x x x x x x',
    lead: siren('D6', 'C#6', 4),
    drums: drums(4, 'K . . . . . K . S . . . K . K .', 'K . . . . . K . S . S . S S S S'),
    heavyDrums: drums(4, 'K . . . . . K . S . . . K . K .', 'K . . . . . K . S . S . S S S S'),
    crash: bars(4, 'c . . . . . . . c . . . . . . .'),
    machine: bars(4, 'D4 D5 D4 D5 C#4 C#5 C#4 C#5 D4 D5 D4 D5 C#4 C#5 C#4 C#5'), clank: bars(4, 'X . . . X . . . X . . . X . X X')
  },
  SOLO: {
    gtr: 'D3: O . x x x . x x O . x x x . x x | Bb2: O . x x x . x x O . x x x . x x | C3: O . x x x . x x O . x x x . x x | A2: O . x x x . x x O - - - Bb2 - C3 -',
    lead: 'D5 F5 A5 D6 A5 F5 D5 F5 A5 D6 F6 D6 A5 F5 A5 D6 | Bb4 D5 F5 Bb5 F5 D5 Bb4 D5 F5 Bb5 D6 Bb5 F5 D5 F5 Bb5 | C5 E5 G5 C6 G5 E5 C5 E5 G5 C6 E6 C6 G5 E5 G5 C6 | C#5 E5 A5 C#6 E6 A6 E6 C#6 A5 - - - - - - -',
    drums: drums(4, G_HEAVY), heavyDrums: drums(4, G_HEAVY), kicks: drums(4, G_GALLOP),
    machine: bars(4, G_SEQ), clank: bars(4, 'X . . . X . . . X . . . X . . .')
  }
};
gallopLine.A.harmony = setBar(harm(gallopLine.A.lead, -2), 3, 'C#5 - - - - - - - . . A4 - C#5 - E5 -');
gallopLine.B.harmony = setBar(harm(gallopLine.B.lead, -2), 1, 'C#6 - - - - - - - A5 - - - E5 - - -');

// ---------- the candidates ----------
const C = {
  a: { name: 'Neon Works', src: neonWorks, bpm: 150, heavyBpm: 168, fight: ['A', 'A', 'B', 'P', 'B'], heavy: ['P', 'B', 'SOLO', 'B', 'P'] },
  b: { name: 'Assembly Line', src: assembly, bpm: 132, heavyBpm: 148, fight: ['A', 'A', 'B', 'A', 'P', 'B'], heavy: ['P', 'B', 'SOLO', 'A', 'B'] },
  c: { name: 'Gallop Line', src: gallopLine, bpm: 172, heavyBpm: 194, fight: ['A', 'A', 'B', 'B', 'P'], heavy: ['P', 'A', 'B', 'SOLO', 'B'] }
};
const plain = o => JSON.parse(JSON.stringify(o));
const all = {};
for (const [k, c] of Object.entries(C)) {
  const id = 'factory' + k.toUpperCase();
  all[id + 'Intro'] = plain(intro(c.name, c.bpm, c.src.I));
  all[id] = plain(track(c.name, c.bpm, c.fight, pick(c.src, [...new Set(c.fight)]), false));
  all[id + 'Heavy'] = plain(track(c.name, c.heavyBpm, c.heavy, pick(c.src, [...new Set(c.heavy)]), true));
}
// factoryBTune: arriving from the quiet ride (the album page's handoff, owner's pick Oct 17), the factory takes Please
// Hold's tune: the machine plays its first phrase in sixteenths at 132 in D minor (the phrase fits as it is), with its
// clank and steam over A then D in the bass, for two bars (M); then the factory's own intro (I), held.
{
  const I = all.factoryBIntro.patterns.I, clk = { note: 'A6', chord: ['Eb6'] }, steps = n => Array(n).fill('.').join(' ');
  const M = { bars: 2, channels: {
    tune: { stem: 'machine', wave: 'pulse', duty: .125, vol: .05, gate: .45, notes: 'E5 E5 E5 E5 G5 G5 G5 G5 E5 E5 D5 D5 C5 C5 C5 C5 | D5 D5 D5 D5 F5 F5 F5 F5 D5 D5 C5 C5 A4 A4 A4 A4',
      envelope: { attack: .002, decay: .03, sustain: .5, release: .02 }, echo: { delay: .11, feedback: .25, repeats: 1 } },
    clank: Object.assign(plain(I.channels.clank), { notes: Array(2).fill([clk, '.', '.', '.', clk, '.', '.', '.', clk, '.', '.', '.', clk, '.', clk, '.']).flat() }),
    steam: Object.assign(plain(I.channels.steam), { notes: steps(14) + ' H . | ' + steps(12) + ' H . H .' }),
    bass: Object.assign(plain(I.channels.bass), { notes: 'A1 - - - - - - - - - - - - - - - | D2 - - - - - - - - - - - D2 - D2 -' })
  } };
  const intro = all.factoryBIntro;
  // M once, then I looping (not held from the start like the plain intro)
  all.factoryBTune = Object.assign(plain(intro), { name: 'Assembly Line · from Please Hold', order: ['M', 'I'], loop: 1, patterns: { M, I: plain(I) } });
  delete all.factoryBTune.startPattern; delete all.factoryBTune.holdPattern;
}
// Note lists on one line each, so the file stays readable.
const NOTES = '@@notes@@', compact = v => JSON.stringify(v, (k, x) => k === 'notes' && Array.isArray(x) ? NOTES + JSON.stringify(x) : x, 2)
  .replace(new RegExp('"' + NOTES + '(.*)"', 'g'), (_, j) => JSON.parse('"' + j + '"'));
const head = `// Floor 48's music candidates. Plain track objects; load before audio.js.
// Generated by tools/unruggabull-ii/factory-music.js (edit it there). For each candidate X (A Neon Works, B Assembly Line,
// C Gallop Line): factoryXIntro (the factory alone, held), factoryX (the fight) and factoryXHeavy (the last line).
// factoryBTune is Assembly Line's intro from the quiet ride: the machine plays Please Hold's tune first.
`;
const body = Object.entries(all).map(([id, t]) => '  ' + JSON.stringify(id) + ': ' + compact(t).replace(/\n/g, '\n  ')).join(',\n');
fs.writeFileSync(FILE, head + 'window.UnrugFactoryMusic = {\n' + body + '\n};\n');
console.log('wrote', FILE, Object.keys(all).join(', '));
