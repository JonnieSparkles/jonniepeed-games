// The teaser's bridge: after the first game's band stops like a tape, the new game wakes up on its own chip synth and
// builds into the title theme (owner, Oct 29: "the tape stop but after like 1.2 s then into a new track that led into
// theme"). Two lengths, in the game's pattern format, registered after audio.js; both in D minor at the theme's 152, so
// music('theme', { boundary: 'bar' }) lands its fanfare on the bridge's last bar line.
//   teaserWake   4 bars: a lone bass and a ticking arpeggio, the saw swelling in, the theme's opening called softly
//                with echo, then a snare roll and a run up into the theme
//   teaserCount  2 bars: a rising arpeggio over a kick, then the roll and the run
(function () {
  'use strict';
  const S = window.UnrugSound;
  const rest = n => Array(n).fill('.').join(' ');
  const pw = (note, len, chord, vol) => ({ note, len, chord, vol });
  const arp = (notes, bars) => Array(bars).fill(Array(4).fill(notes.join(' ')).join(' ')).join(' | ');

  const wake = { bars: 4, channels: {
    // a heartbeat on the bass: the machine's pulse
    bass: { stem: 'bass', wave: 'triangle', vol: .3, gate: .8,
      notes: 'D2 - - . . . . . D2 - - . . . . . | D2 - - . . . . . D2 - - . . . . . | D2 - D2 - D2 - D2 - D2 - D2 - D2 - D2 - | Bb1 - Bb1 - Bb1 - Bb1 - C2 - C2 - C2 - C2 -' },
    // the arpeggio ticking from the start, an octave up from bar 3
    tick: { stem: 'bass', wave: 'pulse', duty: .125, vol: .028, gate: .5, echo: { delay: .2, feedback: .25, repeats: 1 },
      notes: arp(['D4', 'F4', 'A4', 'D5'], 2) + ' | ' + arp(['D5', 'F5', 'A5', 'D6'], 1) + ' | ' + Array(2).fill('Bb4 D5 F5 Bb5').join(' ') + ' ' + Array(2).fill('C5 E5 G5 C6').join(' ') },
    // the overdriven saw: a held D power chord from bar 2, chugs in bar 3, Bb and C in bar 4
    gtr: { stem: 'bass', wave: 'sawtooth', drive: true, vol: .03, notes: [] },   // written out below
    // the theme's opening phrase, called softly with an echo, then a run up into its fanfare
    lead: { stem: 'lead', wave: 'pulse', duty: .5, vol: .06, gate: .92, echo: { delay: .3, feedback: .3, repeats: 2 },
      notes: rest(16) + ' | ' + rest(16) + ' | D5 - - - - - A4 - D5 - F5 - A5 - - - | . . . . . . . . A4 Bb4 C5 D5 E5 F5 G5 A5' },
    drums: { stem: 'drums', wave: 'noise', vol: .5,
      notes: 'k . . k . . . . k . . k . . . . | k . . k . . . . k . . k . . h . | K . h . S . h . K K h . S . h . | K . . . S . . . S S S S S S S S' },
    crash: { stem: 'drums', wave: 'noise', vol: .3, notes: rest(16) + ' | ' + rest(16) + ' | c ' + rest(15) + ' | ' + rest(16) }
  } };
  // the saw's notes: rests for bar 1, a held D power chord in bar 2, chugs in bar 3, Bb and C in bar 4
  wake.channels.gtr.notes = [].concat(Array(16).fill('.'), [pw('D3', 16, ['A3', 'D4'], .022)],
    [pw('D3', 2, ['A3'], .034), '.', pw('D3', 1, ['A3'], .034), pw('D3', 2, ['A3'], .034), '.', pw('D3', 1, ['A3'], .034),
     pw('D3', 2, ['A3'], .034), '.', pw('D3', 1, ['A3'], .034), pw('F3', 2, ['C4'], .034), pw('G3', 2, ['D4'], .034)],
    [pw('Bb2', 8, ['F3', 'Bb3'], .04), pw('C3', 8, ['G3', 'C4'], .04)]);

  const count = { bars: 2, channels: {
    bass: { stem: 'bass', wave: 'triangle', vol: .3, gate: .8, notes: 'D2 - D2 - D2 - D2 - D2 - D2 - D2 - D2 - | Bb1 - Bb1 - Bb1 - Bb1 - C2 - C2 - C2 - C2 -' },
    tick: { stem: 'bass', wave: 'pulse', duty: .125, vol: .03, gate: .5,
      notes: 'D4 F4 A4 D5 F4 A4 D5 F5 A4 D5 F5 A5 D5 F5 A5 D6 | Bb4 D5 F5 Bb5 Bb4 D5 F5 Bb5 C5 E5 G5 C6 C5 E5 G5 C6' },
    gtr: { stem: 'bass', wave: 'sawtooth', drive: true, vol: .034,
      notes: [pw('D3', 2, ['A3']), '.', pw('D3', 1, ['A3']), pw('D3', 2, ['A3']), '.', pw('D3', 1, ['A3']), pw('D3', 2, ['A3']), '.', pw('D3', 1, ['A3']), pw('F3', 2, ['C4']), pw('G3', 2, ['D4']),
        pw('Bb2', 8, ['F3', 'Bb3'], .04), pw('C3', 8, ['G3', 'C4'], .04)] },
    lead: { stem: 'lead', wave: 'pulse', duty: .5, vol: .06, gate: .92, notes: rest(16) + ' | . . . . . . . . A4 Bb4 C5 D5 E5 F5 G5 A5' },
    drums: { stem: 'drums', wave: 'noise', vol: .5, notes: 'K . h . K . h . K . h . K K h . | K . . . S . . . S S S S S S S S' }
  } };

  const track = (name, pattern) => ({ name, key: 'Dm', bpm: 152, swing: 0, loop: 0, order: ['A'], stems: ['bass', 'lead', 'drums'], patterns: { A: pattern } });
  S.registerTrack('teaserWake', track('The machine wakes', wake));
  S.registerTrack('teaserCount', track('Countdown', count));
  window.UnrugTeaserBridge = { wake: 4, count: 2, bar: 60 / 152 * 4 };
})();
