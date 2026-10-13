// The stairwell's music takes, for the design page: two cues for the climb (Neon from the shelf, and Flight Risk, new)
// and three katana fanfares. Round 1's three cues (Alley Climb, Stair Runner, Thirteen Flights) didn't land; they're
// in this file's history.
// Plain track objects in the game's pattern format (audio.js), so whichever is picked moves into the game as it is.
// Each cue grows through the climb: section 1 plays drums, bass and lead; section 2 adds harmony; section 3 adds power
// (Neon's section 3 is its heavy version). The fanfares are one-shots (a silent bar at the end that it loops on); the page
// stops the cue dead before one and slams the cue back in after it.
window.UnrugStairsMusic = (function () {
  'use strict';
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  // move a line of notes by semitones (rests, holds and noise letters stay)
  function shift(line, by) {
    if (!by) return line;
    return line.split(' ').map(tok => {
      const m = /^([A-G][b#]?)(\d)$/.exec(tok);
      if (!m) return tok;
      const n = NAMES.indexOf(FLAT[m[1]] || m[1]) + 12 * +m[2] + by;
      return NAMES[((n % 12) + 12) % 12] + Math.floor(n / 12);
    }).join(' ');
  }
  const bars = (...b) => b.join(' | ');
  const rep = (s, n) => Array(n).fill(s).join(' | ');
  // a chord held for a bar, as one note event
  const held = (root, chord, len = 16, vol) => Object.assign({ note: root, chord, len }, vol ? { vol } : {});

  // ---------- Neon: from the soundtrack page's shelf (neon.js). Sections 1 and 2 grow the fight; 3 is its heavy version ----------
  const NEON = window.UnrugNeonMusic || {};

  // ---------- Flight Risk: new. The riff climbs like the stairs: a pedal-note run up and down off E, the bass walking up a
  // step a bar (E, F#, G, A, C, D, B), a big tune on top. Chip rock at 162 in E minor, the 13th Floor's key. ----------
  const FR_LEAD = bars(
    'E5 B4 E5 F#5 E5 G5 E5 A5 E5 B5 E5 A5 E5 G5 E5 F#5', 'E5 B4 E5 F#5 E5 G5 E5 A5 E5 B5 E5 C6 E5 D6 E5 E6',
    'G5 - - - - - F#5 - G5 - A5 - B5 - - -', 'A5 - - - - - G5 - F#5 - E5 - F#5 - A5 -',
    'C6 - - - B5 - - - A5 - - - G5 - A5 -', 'D6 - - - - - C6 - B5 - A5 - B5 - D6 -',
    'D#6 - - - - - - - F#6 - - - E6 - D#6 -', 'B5 - - - - - - - . . F#5 G5 A5 B5 D6 D#6');
  const FR_HARM = bars(
    'B4 G4 B4 D5 B4 E5 B4 F#5 B4 G5 B4 F#5 B4 E5 B4 D5', 'B4 G4 B4 D5 B4 E5 B4 F#5 B4 G5 B4 A5 B4 B5 B4 C6',
    'E5 - - - - - D5 - E5 - F#5 - G5 - - -', 'F#5 - - - - - E5 - D5 - C#5 - D5 - F#5 -',
    'A5 - - - G5 - - - E5 - - - E5 - F#5 -', 'B5 - - - - - A5 - G5 - F#5 - G5 - B5 -',
    'B5 - - - - - - - D#6 - - - B5 - B5 -', 'F#5 - - - - - - - . . D#5 E5 F#5 G5 A5 B5');
  const FR_ROOTS = ['E2', 'F#2', 'G2', 'A2', 'C3', 'D3', 'B1', 'B1'];
  const FR_TRIADS = ['E4 G4 B4', 'D4 F#4 A4', 'G4 B4 D5', 'A4 C#5 E5', 'C5 E5 G5', 'D5 F#5 A5', 'B4 D#5 F#5', 'B4 D#5 F#5'];
  const pump = r => { const o = shift(r, 12); return `${r} ${o} ${r} ${o} ${r} ${o} ${r} ${o} ${r} ${o} ${r} ${o} ${r} ${o} ${r} ${o}`; };
  // power chords through the overdrive: root, fifth, octave, on a driving eighth-note chug with a push on the "and" of 4
  const chug = r => { const f = shift(r, 7), o = shift(r, 12), hit = (len, gate) => ({ note: r, chord: [f, o], len, gate });
    return [hit(2, .9), hit(1, .4), hit(1, .4), hit(2, .9), hit(1, .4), hit(1, .4), hit(2, .9), hit(1, .4), hit(1, .4), hit(2, .9), hit(1, .4), hit(1, .4)]; };
  const flight = {
    name: 'Stairwell · Flight Risk', key: 'Em', bpm: 162, swing: 0, loop: 0, order: ['A'], stems: ['drums', 'bass', 'lead'],
    patterns: { A: { bars: 8, channels: {
      drums: { stem: 'drums', wave: 'noise', vol: .52, notes: bars('c . h K S . h . K K h . S . h .', ...Array(6).fill('K . h K S . h . K K h . S . h .'), 'K . h K S . S S S S S S S S S S') },
      bass: { stem: 'bass', wave: 'triangle', vol: .3, gate: .6, notes: bars(...FR_ROOTS.map(pump)) },
      lead: { stem: 'lead', wave: 'pulse', duty: .5, vol: .085, gate: .9, notes: FR_LEAD, vibrato: { rate: 6, depth: .01, delay: .14 }, echo: { delay: .17, feedback: .2, repeats: 2 } },
      harmony: { stem: 'harmony', wave: 'pulse', duty: .25, vol: .045, gate: .9, notes: FR_HARM },
      arp: { stem: 'harmony', wave: 'pulse', duty: .125, vol: .022, gate: .5, notes: bars(...FR_TRIADS.map(q => { const t = q.split(' '); return t.concat([shift(t[0], 12)]).concat(t).concat([shift(t[0], 12)]).concat(t).concat([shift(t[0], 12)]).concat(t).concat([shift(t[0], 12)]).join(' '); })) },
      power: { stem: 'power', wave: 'sawtooth', vol: .045, drive: true, notes: FR_ROOTS.flatMap(r => chug(shift(r, 12))) },
      kick2: { stem: 'power', wave: 'noise', vol: .38, notes: rep('K K . K K K . K K K . K K K . K', 7) + ' | K K K K K K K K S S S S S S S S' },
      crash: { stem: 'power', wave: 'noise', vol: .35, notes: rep('c . . . . . . . . . . . . . . .', 8) }
    } } }
  };

  // ---------- the fanfares: written in E major, moved to A for the Alley cue. About 3.5 to 4.5 seconds each. ----------
  const Z = { bars: 1, channels: { rest: { stem: 'all', wave: 'triangle', vol: 0, notes: '. . . . . . . . . . . . . . . .' } } };
  // 1, "Ta-ta-ta-TAAA": three pickups, a climb, the top note held over a big chord with a snare roll, and a button.
  function fanfare1(k) {
    const s = l => shift(l, k);
    return { name: 'Fanfare 1: Ta-ta-ta-TAAA', bpm: 176, swing: 0, loop: 3, order: ['A', 'B', 'C', 'Z'], stems: ['all'],
      patterns: {
        A: { bars: 1, channels: {
          lead: { stem: 'all', wave: 'pulse', duty: .5, vol: .1, gate: .8, notes: s('B4 . B4 . B4 . E5 - - - - - D#5 - E5 -') },
          harm: { stem: 'all', wave: 'pulse', duty: .25, vol: .06, gate: .8, notes: s('G#4 . G#4 . G#4 . B4 - - - - - B4 - B4 -') },
          bass: { stem: 'all', wave: 'triangle', vol: .3, gate: .8, notes: s('E2 . E2 . E2 . E2 - - - - - B1 - E2 -') },
          dr: { stem: 'all', wave: 'noise', vol: .5, notes: 'S . S . S . K . . . . . S . K .' } } },
        B: { bars: 1, channels: {
          lead: { stem: 'all', wave: 'pulse', duty: .5, vol: .1, gate: .95, notes: s('F#5 - - - G#5 - - - A5 - - - B5 - C#6 -') },
          harm: { stem: 'all', wave: 'pulse', duty: .25, vol: .06, gate: .95, notes: s('D#5 - - - E5 - - - F#5 - - - G#5 - A5 -') },
          bass: { stem: 'all', wave: 'triangle', vol: .3, gate: .9, notes: s('B1 - - - C#2 - - - D#2 - - - B1 - - -') },
          dr: { stem: 'all', wave: 'noise', vol: .45, notes: 'S . s . S . s . S s S s S S S S' } } },
        C: { bars: 1, channels: {
          lead: { stem: 'all', wave: 'pulse', duty: .5, vol: .11, gate: .95, notes: [{ note: s('E6'), len: 11, vibrato: { rate: 6.5, depth: .014, delay: .2 } }, '.', s('B5'), '.', s('E6'), '.'] },
          harm: { stem: 'all', wave: 'pulse', duty: .25, vol: .05, gate: .95, notes: [held(s('G#5'), [s('B5')], 11), '.', s('G#5'), '.', s('B5'), '.'] },
          pad: { stem: 'all', wave: 'sawtooth', vol: .035, gate: 1, drive: true, notes: [held(s('E3'), [s('B3'), s('E4')], 11)] },
          bass: { stem: 'all', wave: 'triangle', vol: .32, gate: .95, notes: s('E2 - - - - - - - - - - . B1 . E2 .') },
          dr: { stem: 'all', wave: 'noise', vol: .55, notes: 'c . . . . . s s s s s . K . c .' } } },
        Z
      } };
  }
  // 2, "Cascade": a waterfall of arpeggios up two octaves, then the chord rings with a sparkle on top.
  function fanfare2(k) {
    const s = l => shift(l, k);
    return { name: 'Fanfare 2: Cascade', bpm: 140, swing: 0, loop: 2, order: ['A', 'B', 'Z'], stems: ['all'],
      patterns: {
        A: { bars: 1, channels: {
          lead: { stem: 'all', wave: 'pulse', duty: .25, vol: .09, gate: .7, notes: s('E5 G#5 B5 E6 G#5 B5 E6 G#6 B5 E6 G#6 B6 E6 G#6 B6 E7') },
          echo: { stem: 'all', wave: 'pulse', duty: .125, vol: .04, gate: .6, notes: s('. E5 G#5 B5 E6 G#5 B5 E6 G#6 B5 E6 G#6 B6 E6 G#6 B6') },
          bass: { stem: 'all', wave: 'triangle', vol: .3, gate: .9, notes: s('E2 - - - B2 - - - E3 - - - G#3 - B3 -') },
          dr: { stem: 'all', wave: 'noise', vol: .45, notes: 'K . h . h . h . K . h . S S S S' } } },
        B: { bars: 1, channels: {
          lead: { stem: 'all', wave: 'pulse', duty: .5, vol: .1, gate: 1, notes: [{ note: s('E6'), len: 14, vibrato: { rate: 6, depth: .012, delay: .3 } }] },
          harm: { stem: 'all', wave: 'pulse', duty: .25, vol: .05, gate: 1, notes: [held(s('B5'), [s('G#5')], 14)] },
          sparkle: { stem: 'all', wave: 'pulse', duty: .125, vol: .03, gate: .4, notes: s('B6 E7 G#6 B6 E7 G#6 B6 E7 G#6 B6 E7 G#6 . . . .') },
          pad: { stem: 'all', wave: 'sawtooth', vol: .03, gate: 1, drive: true, notes: [held(s('E3'), [s('B3'), s('E4')], 14)] },
          bass: { stem: 'all', wave: 'triangle', vol: .32, gate: .95, notes: s('E2 - - - - - - - - - - - - - . .') },
          dr: { stem: 'all', wave: 'noise', vol: .5, notes: 'c . . . . . . . . . . . . . . .' } } },
        Z
      } };
  }
  // 3, "Over the Top": hits climbing a key each time (C, D, E), a roll, then a held chord with a power-chord slam.
  function fanfare3(k) {
    const s = l => shift(l, k);
    const two = (a, b) => `${a} . ${a} - - - - - ${b} . ${b} - - - - -`;
    return { name: 'Fanfare 3: Over the Top', bpm: 160, swing: 0, loop: 3, order: ['A', 'B', 'C', 'Z'], stems: ['all'],
      patterns: {
        A: { bars: 1, channels: {
          lead: { stem: 'all', wave: 'pulse', duty: .5, vol: .1, gate: .9, notes: s(two('C6', 'D6')) },
          harm: { stem: 'all', wave: 'pulse', duty: .25, vol: .055, gate: .9, notes: s(two('G5', 'A5')) },
          harm2: { stem: 'all', wave: 'pulse', duty: .125, vol: .04, gate: .9, notes: s(two('E5', 'F#5')) },
          pow: { stem: 'all', wave: 'sawtooth', vol: .045, gate: .8, drive: true, notes: s(two('C3', 'D3')) },
          bass: { stem: 'all', wave: 'triangle', vol: .3, gate: .85, notes: s(two('C2', 'D2')) },
          dr: { stem: 'all', wave: 'noise', vol: .55, notes: 'c . K . . . T T c . K . . . T T' } } },
        B: { bars: 1, channels: {
          lead: { stem: 'all', wave: 'pulse', duty: .5, vol: .11, gate: .9, notes: s('E6 . E6 - - - - - . . . . . . . .') },
          harm: { stem: 'all', wave: 'pulse', duty: .25, vol: .06, gate: .9, notes: s('B5 . B5 - - - - - . . . . . . . .') },
          harm2: { stem: 'all', wave: 'pulse', duty: .125, vol: .045, gate: .9, notes: s('G#5 . G#5 - - - - - . . . . . . . .') },
          pow: { stem: 'all', wave: 'sawtooth', vol: .05, gate: .8, drive: true, notes: s('E3 . E3 - - - - - . . . . . . . .') },
          bass: { stem: 'all', wave: 'triangle', vol: .3, gate: .85, notes: s('E2 . E2 - - - - - B1 C#2 D#2 E2 F#2 G#2 A2 B2') },
          dr: { stem: 'all', wave: 'noise', vol: .55, notes: 'c . K . . . . . T T T T S S S S' } } },
        C: { bars: 1, channels: {
          lead: { stem: 'all', wave: 'pulse', duty: .5, vol: .11, gate: 1, notes: [{ note: s('E6'), len: 14, vibrato: { rate: 7, depth: .016, delay: .2 } }] },
          lead2: { stem: 'all', wave: 'pulse', duty: .25, vol: .06, gate: 1, notes: [held(s('G#5'), [s('B5')], 14)] },
          choir: { stem: 'all', wave: 'sawtooth', vol: .03, gate: 1, notes: [held(s('E4'), [s('G#4'), s('B4'), s('E5')], 14)] },
          pow: { stem: 'all', wave: 'sawtooth', vol: .06, gate: 1, drive: true, notes: [held(s('E2'), [s('B2'), s('E3')], 14)] },
          bass: { stem: 'all', wave: 'triangle', vol: .34, gate: .95, notes: s('E1 - - - - - - - - - - - - - . .') },
          dr: { stem: 'all', wave: 'noise', vol: .6, notes: 'c . . . . . . . . . . . . . . .' } } },
        Z
      } };
  }
  // 4, "Over the Top", cut for Flight Risk: the same climbing hits, but up Flight Risk's own stairs (G, A, C, D) to a
  // big E major chord, at Flight Risk's tempo so the cue slams back in on the beat, with a roll into its downbeat.
  function fanfare4(k) {
    const s = l => shift(l, k);
    const two = (a, b) => `${a} . ${a} - - - - - ${b} . ${b} - - - - -`;
    const pw = (a, b) => [{ note: a, chord: [shift(a, 7), shift(a, 12)], len: 1 }, '.', { note: a, chord: [shift(a, 7), shift(a, 12)], len: 6 },
      { note: b, chord: [shift(b, 7), shift(b, 12)], len: 1 }, '.', { note: b, chord: [shift(b, 7), shift(b, 12)], len: 6 }];
    return { name: 'Fanfare 4: Over the Top, up the stairs', bpm: 162, swing: 0, loop: 3, order: ['A', 'B', 'C', 'Z'], stems: ['all'],
      patterns: {
        A: { bars: 1, channels: {
          lead: { stem: 'all', wave: 'pulse', duty: .5, vol: .1, gate: .9, notes: s(two('G5', 'A5')) },
          harm: { stem: 'all', wave: 'pulse', duty: .25, vol: .055, gate: .9, notes: s(two('D5', 'E5')) },
          harm2: { stem: 'all', wave: 'pulse', duty: .125, vol: .04, gate: .9, notes: s(two('B4', 'C#5')) },
          pow: { stem: 'all', wave: 'sawtooth', vol: .045, gate: .8, drive: true, notes: pw(s('G2'), s('A2')) },
          bass: { stem: 'all', wave: 'triangle', vol: .3, gate: .85, notes: s(two('G2', 'A2')) },
          dr: { stem: 'all', wave: 'noise', vol: .55, notes: 'c . K . . . T T c . K . . . T T' } } },
        B: { bars: 1, channels: {
          lead: { stem: 'all', wave: 'pulse', duty: .5, vol: .1, gate: .9, notes: s(two('C6', 'D6')) },
          harm: { stem: 'all', wave: 'pulse', duty: .25, vol: .055, gate: .9, notes: s(two('G5', 'A5')) },
          harm2: { stem: 'all', wave: 'pulse', duty: .125, vol: .04, gate: .9, notes: s(two('E5', 'F#5')) },
          pow: { stem: 'all', wave: 'sawtooth', vol: .05, gate: .8, drive: true, notes: pw(s('C3'), s('D3')) },
          bass: { stem: 'all', wave: 'triangle', vol: .3, gate: .85, notes: s(two('C3', 'D3')) },
          dr: { stem: 'all', wave: 'noise', vol: .55, notes: 'c . K . . . T T c . K . T T T T' } } },
        C: { bars: 1, channels: {
          lead: { stem: 'all', wave: 'pulse', duty: .5, vol: .11, gate: 1, notes: [{ note: s('E6'), len: 12, vibrato: { rate: 7, depth: .016, delay: .2 } }, '.', '.', '.', '.'] },
          lead2: { stem: 'all', wave: 'pulse', duty: .25, vol: .06, gate: 1, notes: [held(s('G#5'), [s('B5')], 12), '.', '.', '.', '.'] },
          choir: { stem: 'all', wave: 'sawtooth', vol: .03, gate: 1, notes: [held(s('E4'), [s('G#4'), s('B4'), s('E5')], 12), '.', '.', '.', '.'] },
          pow: { stem: 'all', wave: 'sawtooth', vol: .06, gate: 1, drive: true, notes: [held(s('E2'), [s('B2'), s('E3')], 12), '.', '.', '.', '.'] },
          bass: { stem: 'all', wave: 'triangle', vol: .34, gate: .95, notes: s('E2 - - - - - - - - - - - B1 C#2 D#2 D#2') },
          dr: { stem: 'all', wave: 'noise', vol: .6, notes: 'c . . . . . . . . . . . S S S S' } } },
        Z
      } };
  }
  // Each cue, section by section: which track plays and on which stems. Moving between sections lands on the next bar.
  const STEMS = { 1: ['drums', 'bass', 'lead'], 2: ['drums', 'bass', 'lead', 'harmony'], 3: ['drums', 'bass', 'lead', 'harmony', 'power'] };
  const CUES = {
    neon: { name: 'Neon', tracks: { stairNeon: NEON.neon, stairNeonHeavy: NEON.neonHeavy },
      sections: { 1: ['stairNeon', STEMS[1]], 2: ['stairNeon', STEMS[2]], 3: ['stairNeonHeavy', STEMS[3].concat(['heavy'])] } },
    flight: { name: 'Flight Risk', tracks: { stairFlight: flight },
      sections: { 1: ['stairFlight', STEMS[1]], 2: ['stairFlight', STEMS[2]], 3: ['stairFlight', STEMS[3]] } }
  };
  const KEYSHIFT = { neon: -2, flight: 0 };   // the fanfares sit in the cue's key: D major for Neon, E for Flight Risk
  // a fanfare's length in seconds: every bar before the silent one
  const seconds = tr => tr.order.slice(0, -1).reduce((n, p) => n + tr.patterns[p].bars * 16, 0) * 60 / tr.bpm / 4;
  return { CUES, KEYSHIFT, FANFARES: [fanfare1, fanfare2, fanfare3, fanfare4], seconds, shift, STEMS };
})();
