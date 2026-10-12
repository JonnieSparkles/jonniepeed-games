// Please Hold: intentionally plain, calm muzak. Replace this object for the music pass.
window.UnrugElevatorMusic = {
  pleaseHold: {
    name: 'Please Hold (placeholder)', key: 'C', bpm: 92, swing: .08,
    loop: 0, order: ['A'], stems: ['lead', 'bass', 'harmony'],
    patterns: { A: { bars: 4, channels: {
      lead: { stem: 'lead', wave: 'pulse', duty: .5, vol: .025,
        notes: 'E5 - G5 - A5 - G5 - E5 - - - D5 - - - | F5 - A5 - G5 - F5 - E5 - - - C5 - - - | D5 - F5 - E5 - D5 - C5 - - - A4 - - - | B4 - D5 - G5 - F5 - E5 - - - C5 - - -' },
      bass: { stem: 'bass', wave: 'triangle', vol: .1,
        notes: 'C3 - - - G3 - - - C3 - - - G3 - - - | F3 - - - C3 - - - F3 - - - C3 - - - | D3 - - - A3 - - - D3 - - - A3 - - - | G2 - - - D3 - - - G2 - - - D3 - - -' },
      harmony: { stem: 'harmony', wave: 'pulse', duty: .25, vol: .012,
        notes: [{ note: 'C4', chord: ['E4','G4'], len: 16 }, { note: 'F4', chord: ['A4','C5'], len: 16 },
          { note: 'D4', chord: ['F4','A4'], len: 16 }, { note: 'G3', chord: ['B3','D4'], len: 16 }] }
    } } }
  }
};

// Horns Up is one track: the intro is the same muzak, held until the GAME's cable-snap cue.
// Named pattern starts/holds let a composer replace sections without retiming the ride.
window.UnrugElevatorMusic.hornsUp = {
  name: 'Horns Up (placeholder)', key: 'C', bpm: 92, swing: .08,
  order: ['intro', 'heavy'], loop: 0, startPattern: 'intro', holdPattern: true,
  stems: ['lead', 'bass', 'harmony', 'drums'],
  patterns: {
    intro: window.UnrugElevatorMusic.pleaseHold.patterns.A,
    heavy: { bars: 2, bpm: 168, swing: 0, channels: {
      lead: { stem: 'lead', wave: 'sawtooth', vol: .07,
        notes: 'E5 . E5 . G5 - A5 - G5 . E5 . D5 - C5 - | F5 . A5 . G5 - F5 - E5 . D5 . C5 - - -' },
      bass: { stem: 'bass', wave: 'triangle', vol: .22,
        notes: 'C2 C2 C3 C2 C2 C2 G2 C2 C2 C2 C3 C2 C2 C2 G2 C2 | F2 F2 F3 F2 F2 F2 C3 F2 C2 C2 G2 G2 C2 - - -' },
      harmony: { stem: 'harmony', wave: 'pulse', duty: .25, vol: .035,
        notes: 'C4 . G4 . C4 . G4 . C4 . G4 . C4 . G4 . | F4 . A4 . F4 . A4 . C4 . G4 . C4 - - -' },
      drums: { stem: 'drums', wave: 'noise', vol: .55,
        notes: 'K h h h S h h h K h h h S h h H | K h h h S h h h K h K h S h h H' }
    } }
  }
};
