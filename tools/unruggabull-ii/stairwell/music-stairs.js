// The stairwell's music takes, for the design page: three cues for the climb and three katana fanfares.
// Plain track objects in the game's pattern format (audio.js), so whichever is picked moves into the game as it is.
// Each cue is one 8-bar loop that grows by stems through the climb: section 1 plays drums, bass and lead; section 2
// adds harmony; section 3 adds power. The fanfares are one-shots (a silent bar at the end that it loops on); the page
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

  // ---------- A: Alley Climb, the first game's alley tune (the old `staff` track), climbing ----------
  const ALLEY_LEAD = bars(
    'A4 - - C5 - E5 - - A5 - - G5 - E5 - -', 'F5 - - E5 - C5 - - A4 - - C5 - F5 - -',
    'G5 - - E5 - C5 - - G4 - - C5 - E5 - -', 'D5 - - B4 - G4 - - D5 - E5 - G5 - - -',
    'A5 . A5 . G5 . E5 . A5 - - - C6 - B5 -', 'A5 . A5 . G5 . F5 . A5 - - - C6 - A5 -',
    'G5 . G5 . E5 . C5 . G5 - - - E5 - G5 -', 'B5 - - - A5 - - - G5 - - - B5 - D6 -');
  const ALLEY_HARM = bars(
    'E4 - - A4 - C5 - - E5 - - E5 - C5 - -', 'C5 - - C5 - A4 - - F4 - - A4 - C5 - -',
    'E5 - - C5 - G4 - - E4 - - G4 - C5 - -', 'B4 - - G4 - D4 - - B4 - C5 - D5 - - -',
    'E5 . E5 . E5 . C5 . E5 - - - A5 - G5 -', 'F5 . F5 . E5 . C5 . F5 - - - A5 - F5 -',
    'E5 . E5 . C5 . G4 . E5 - - - C5 - E5 -', 'G5 - - - F5 - - - D5 - - - G5 - B5 -');
  const ALLEY_BASS = bars(
    'A2 . A2 A3 A2 . A2 A3 A2 . A2 A3 G2 . G2 G3', 'F2 . F2 F3 F2 . F2 F3 F2 . F2 F3 E2 . E2 E3',
    'C3 . C3 C4 C3 . C3 C4 C3 . C3 C4 B2 . B2 B3', 'G2 . G2 G3 G2 . G2 G3 G2 . A2 . B2 . D3 .',
    'A2 . A2 A3 A2 . A2 A3 A2 . A2 A3 G2 . G2 G3', 'F2 . F2 F3 F2 . F2 F3 F2 . F2 F3 E2 . E2 E3',
    'C3 . C3 C4 C3 . C3 C4 C3 . C3 C4 B2 . B2 B3', 'G2 . G2 G3 G2 . G2 G3 G2 . G2 . G2 G2 G2 G2');
  const ALLEY_POWER = bars(...['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'C3', 'G2'].map(r => `${r} . ${r} ${r} ${r} . ${r} ${r} ${r} . ${r} ${r} ${r} . ${r} ${r}`));
  const DRUMS_ROCK = 'K . h . S . h K K . h . S . h h';
  const alley = {
    name: 'Stairwell · A: Alley Climb', key: 'Am', bpm: 156, swing: 0, loop: 0, order: ['A'], stems: ['drums', 'bass', 'lead'],
    patterns: { A: { bars: 8, channels: {
      drums: { stem: 'drums', wave: 'noise', vol: .5, notes: bars(...Array(7).fill(DRUMS_ROCK), 'K . h . S . h K S S S S S S S S') },
      bass: { stem: 'bass', wave: 'triangle', vol: .28, gate: .7, notes: ALLEY_BASS },
      lead: { stem: 'lead', wave: 'pulse', duty: .5, vol: .085, gate: .9, notes: ALLEY_LEAD, vibrato: { rate: 6, depth: .008, delay: .12 } },
      harmony: { stem: 'harmony', wave: 'pulse', duty: .25, vol: .05, gate: .9, notes: ALLEY_HARM },
      arp: { stem: 'harmony', wave: 'pulse', duty: .125, vol: .025, gate: .5, notes: bars(...['A4 C5 E5 A5', 'F4 A4 C5 F5', 'C5 E5 G5 C6', 'G4 B4 D5 G5', 'A4 C5 E5 A5', 'F4 A4 C5 F5', 'C5 E5 G5 C6', 'G4 B4 D5 G5'].map(q => (q + ' ').repeat(4).trim())) },
      power: { stem: 'power', wave: 'sawtooth', vol: .05, gate: .85, drive: true, notes: ALLEY_POWER },
      kick2: { stem: 'power', wave: 'noise', vol: .4, notes: rep('. . . k . . . k . . . k . . k k', 8) }
    } } }
  };

  // ---------- B: Stair Runner, new, driving, in E minor so the door lands next to the 13th Floor's shuffle ----------
  const RUN_LEAD = bars(
    'E5 - - - B4 - E5 - G5 - - - F#5 - E5 -', 'G5 - - - E5 - C5 - E5 - - - D5 - C5 -',
    'D5 - - - A4 - D5 - F#5 - - - A5 - F#5 -', 'D#5 - - - - - B4 - D#5 - F#5 - B5 - - -',
    'E6 - - - B5 - G5 - E5 - - - G5 - B5 -', 'C6 - - - B5 - A5 - G5 - - - E5 - G5 -',
    'A5 - - - G5 - F#5 - E5 - - - C5 - E5 -', 'D#5 - - - - - - - F#5 - - - B5 - - -');
  const RUN_HARM = shift(RUN_LEAD, -3).replace(/D#4/g, 'C4');   // roughly a third below; the page's ears are the judge
  const gallop = r => `${r} . ${r} ${r} ${r} . ${r} ${r} ${r} . ${r} ${r} ${r} . ${r} ${r}`;
  const RUN_ROOTS = ['E2', 'C2', 'D2', 'B1', 'E2', 'C2', 'A1', 'B1'];
  const runner = {
    name: 'Stairwell · B: Stair Runner', key: 'Em', bpm: 164, swing: 0, loop: 0, order: ['A'], stems: ['drums', 'bass', 'lead'],
    patterns: { A: { bars: 8, channels: {
      drums: { stem: 'drums', wave: 'noise', vol: .52, notes: bars(...Array(7).fill('K . h K S . h . K K h . S . h h'), 'K . h K S . S S S S S S S S S S') },
      bass: { stem: 'bass', wave: 'triangle', vol: .3, gate: .6, notes: bars(...RUN_ROOTS.map(r => shift(gallop(r), 12))) },
      lead: { stem: 'lead', wave: 'pulse', duty: .25, vol: .09, gate: .92, notes: RUN_LEAD, vibrato: { rate: 6, depth: .01, delay: .15 } },
      harmony: { stem: 'harmony', wave: 'pulse', duty: .5, vol: .045, gate: .92, notes: RUN_HARM },
      power: { stem: 'power', wave: 'sawtooth', vol: .05, gate: .8, drive: true, notes: bars(...RUN_ROOTS.map(r => shift(gallop(r), 12))) },
      arp: { stem: 'power', wave: 'pulse', duty: .125, vol: .022, gate: .5, notes: bars(...['E5 G5 B5 E6', 'C5 E5 G5 C6', 'D5 F#5 A5 D6', 'B4 D#5 F#5 B5', 'E5 G5 B5 E6', 'C5 E5 G5 C6', 'A4 C5 E5 A5', 'B4 D#5 F#5 B5'].map(q => (q + ' ').repeat(4).trim())) }
    } } }
  };

  // ---------- C: Thirteen Flights, tense: a ticking ostinato that piles up section by section, peaking at the door ----------
  const OST = ['E4 B4 E5 B4', 'E4 C5 E5 C5', 'E4 B4 E5 B4', 'D#4 B4 D#5 B4'];
  const build = {
    name: 'Stairwell · C: Thirteen Flights', key: 'Em', bpm: 138, swing: 0, loop: 0, order: ['A'], stems: ['drums', 'bass', 'lead'],
    patterns: { A: { bars: 8, channels: {
      tick: { stem: 'drums', wave: 'pulse', duty: .125, vol: .045, gate: .45, notes: bars(...OST.concat(OST).map(q => (q + ' ').repeat(4).trim())) },
      drums: { stem: 'drums', wave: 'noise', vol: .45, notes: rep('K . . . . . . . K . . . . . . .', 3) + ' | K . . . . . . . K . . . K . K K | ' + rep('K . . . . . . . K . . . . . . .', 3) + ' | K . . . K . . . K . K . K K K K' },
      bass: { stem: 'bass', wave: 'triangle', vol: .3, gate: .95, notes: bars('E2 - - - - - - - - - - - - - - -', 'C2 - - - - - - - - - - - - - - -', 'E2 - - - - - - - - - - - - - - -', 'B1 - - - - - - - - - - - - B1 - -',
        'E2 - - - - - - - - - - - - - - -', 'C2 - - - - - - - - - - - - - - -', 'A1 - - - - - - - - - - - - - - -', 'B1 - - - - - - - B1 - - - B1 - B1 -') },
      lead: { stem: 'lead', wave: 'pulse', duty: .5, vol: .07, gate: .97, notes: bars('B5 - - - - - - - - - - - G5 - - -', 'E5 - - - - - - - - - - - - - - -', 'B5 - - - - - - - C6 - - - B5 - - -', 'F#5 - - - - - - - - - - - D#5 - - -',
        'G5 - - - - - - - - - - - E5 - - -', 'C6 - - - - - - - - - - - B5 - - -', 'A5 - - - - - - - G5 - - - F#5 - - -', 'D#5 - - - - - - - F#5 - - - B5 - - -'), vibrato: { rate: 5, depth: .012, delay: .25 } },
      snare: { stem: 'harmony', wave: 'noise', vol: .4, notes: rep('. . h . S . h . . . h . S . h .', 7) + ' | . . h . S . h . S . S . S S S S' },
      harmony: { stem: 'harmony', wave: 'pulse', duty: .25, vol: .04, gate: .97, notes: bars('E5 - - - - - - - - - - - - - - -', 'C5 - - - - - - - - - - - - - - -', 'G5 - - - - - - - A5 - - - G5 - - -', 'D#5 - - - - - - - - - - - B4 - - -',
        'E5 - - - - - - - - - - - B4 - - -', 'G5 - - - - - - - - - - - E5 - - -', 'E5 - - - - - - - C5 - - - C5 - - -', 'B4 - - - - - - - D#5 - - - F#5 - - -') },
      power: { stem: 'power', wave: 'sawtooth', vol: .05, gate: .8, drive: true, notes: bars(...['E2', 'C2', 'E2', 'B1', 'E2', 'C2', 'A1', 'B1'].map(r => shift(`${r} ${r} ${r} ${r} ${r} ${r} ${r} ${r} ${r} ${r} ${r} ${r} ${r} ${r} ${r} ${r}`, 12))) },
      hats: { stem: 'power', wave: 'noise', vol: .35, notes: rep('h h h h h h h h h h h h h h h h', 8) }
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
  const CUES = { alley, runner, build };
  const KEYSHIFT = { alley: -7, runner: 0, build: 0 };   // the fanfares sit in the cue's key: A major for the alley, E for the others
  // a fanfare's length in seconds: every bar before the silent one
  const seconds = tr => tr.order.slice(0, -1).reduce((n, p) => n + tr.patterns[p].bars * 16, 0) * 60 / tr.bpm / 4;
  return { CUES, KEYSHIFT, FANFARES: [fanfare1, fanfare2, fanfare3], seconds, shift,
    STEMS: { 1: ['drums', 'bass', 'lead'], 2: ['drums', 'bass', 'lead', 'harmony'], 3: ['drums', 'bass', 'lead', 'harmony', 'power'] } };
})();
