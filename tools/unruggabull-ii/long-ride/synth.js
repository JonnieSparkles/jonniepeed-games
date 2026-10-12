let AC = null, voiceBus = null, musicBus = null, scopeAn = null, NOISE = null;
const WAVES = {};
const MUSIC_LEVEL = .5, DUCK = .14;
function audio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      voiceBus = AC.createGain(); voiceBus.gain.value = .9;
      const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
      voiceBus.connect(lp).connect(AC.destination);
      musicBus = AC.createGain(); musicBus.gain.value = MUSIC_LEVEL;
      scopeAn = AC.createAnalyser(); scopeAn.fftSize = 1024;
      musicBus.connect(scopeAn); scopeAn.connect(AC.destination);
      for (const [k, d] of [['p12', .125], ['p25', .25], ['p50', .5]]) {
        const n = 32, re = new Float32Array(n), im = new Float32Array(n);
        for (let i = 1; i < n; i++) re[i] = 2 / (i * Math.PI) * Math.sin(i * Math.PI * d);
        WAVES[k] = AC.createPeriodicWave(re, im);
      }
      NOISE = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const nd = NOISE.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    } catch (e) { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume();
}
function osc(dest, wave, f, t, dur, vol, o = {}) {
  const s = AC.createOscillator();
  if (WAVES[wave]) s.setPeriodicWave(WAVES[wave]); else s.type = wave;
  s.frequency.setValueAtTime(f, t);
  if (o.to) s.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  const g = AC.createGain(), a = o.attack || .004, end = t + Math.max(.02, dur);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.linearRampToValueAtTime(vol * (o.sustain ?? .7), Math.max(t + a, end - .015)); g.gain.linearRampToValueAtTime(.0001, end);
  if (o.vib && dur > .15) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = 5.5; lg.gain.value = f * .012; l.connect(lg).connect(s.frequency); l.start(t + .1); l.stop(end + .02); }
  s.connect(g).connect(dest); s.start(t); s.stop(end + .03);
  return s;
}
function noiseHit(dest, t, dur, vol, type, freq, q = 1) {
  const s = AC.createBufferSource(); s.buffer = NOISE;
  const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(dest); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  return s;
}
const NI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = n => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); return (+m[3] + 1) * 12 + NI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dim: [0, 3, 6, 9] };
function chordOf(name) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(name);
  const pc = NI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return { arp: 60 + pc - (pc >= 5 ? 12 : 0), bass: 36 + pc - (pc >= 7 ? 12 : 0), iv: QUAL[m[3]] };
}
const toks = s => s.trim().split(/\s+/).filter(x => x !== '|');
// Diatonic shift for harmony lines: move a note n scale steps (n = -2 is a third below).
const DMIN = [0, 2, 4, 5, 7, 9, 10];
function dia(m, steps, scale) {
  const pcs = [...scale].sort((a, b) => a - b), n = pcs.length, oct = Math.floor(m / 12), pc = ((m % 12) + 12) % 12;
  let idx = pcs.indexOf(pc);
  if (idx < 0) for (let d = 1; d < 12; d++) { const k = pcs.indexOf((pc - d + 12) % 12); if (k >= 0) { idx = k; break; } }
  const total = oct * n + idx + steps, o2 = Math.floor(total / n), i2 = ((total % n) + n) % n;
  return o2 * 12 + pcs[i2];
}
function compile(sec) {
  const bars = sec.chords.length, steps = bars * 16, stepDur = 60 / sec.bpm / 4;
  const chans = [];
  const tr = sec.transpose || 0;
  const add = (cfg, evs) => { const byStep = {}; for (const e0 of evs) { const e = tr ? { ...e0, m: e0.m + tr } : e0; (byStep[e.step] = byStep[e.step] || []).push(e); } chans.push({ ...cfg, byStep }); };
  const lineEvents = (list, base = 0) => { const evs = []; let last = null; list.forEach((tk, i) => { if (tk === '-') { if (last) last.len++; } else if (tk === '.') last = null; else { const o = typeof tk === 'object' ? tk : { m: typeof tk === 'number' ? tk : midi(tk) }; last = { step: base + i, len: 1, m: o.m, g: o.g }; evs.push(last); } }); return evs; };
  const rel = (p, root, ch) => p === '-' || p === '.' ? p : p === 'R' ? root : p === 'M' ? { m: root, g: .3 } : p === 'O' ? root + 12 : p === 'F' ? root + 7 : p === 'T' ? root + ch.iv[1] : /^\+\d+$/.test(p) ? root + (+p.slice(1)) : p;
  const patsOf = c => (c.pats || [c.pat]).map(toks);
  let leadEvs = null;
  if (sec.lead) { leadEvs = lineEvents(toks(sec.lead.notes)); add(sec.lead, leadEvs); }
  if (sec.leads && leadEvs) for (const L of sec.leads) add(L, leadEvs.map(e => ({ ...e, m: L.harm ? dia(e.m, L.harm, sec.scale || DMIN) : e.m + (L.shift || 0) })));
  if (sec.riff) {
    const pats = patsOf(sec.riff), list = [];
    sec.chords.forEach((c, bi) => { const ch = chordOf(c), pc = (ch.bass % 12 + 12) % 12, r = 40 + ((pc - 4 + 12) % 12); for (const p of pats[bi % pats.length]) list.push(rel(p, r, ch)); });
    const evs = [];
    for (const e of lineEvents(list)) { evs.push(e, { ...e, m: e.m + 7 }); if (sec.riff.oct) evs.push({ ...e, m: e.m + 12 }); }
    add(sec.riff, evs);
  }
  for (const A of [sec.arp, ...(sec.arps || [])].filter(Boolean)) {
    const evs = [];
    sec.chords.forEach((c, b) => {
      const ch = chordOf(c), tones = [...ch.iv, 12].map(v => ch.arp + v);
      if (A.mode === 'pad') { for (const n of ch.iv) evs.push({ step: b * 16, len: 16, m: ch.arp + n }); return; }
      const seq = A.mode === 'updown' ? [...tones, ...tones.slice(1, -1).reverse()] : tones;
      for (let s = 0; s < 16; s++) evs.push({ step: b * 16 + s, len: 1, m: seq[s % seq.length] });
    });
    add(A, evs);
  }
  if (sec.bass) {
    const pats = patsOf(sec.bass), list = [];
    sec.chords.forEach((c, bi) => { const ch = chordOf(c); for (const p of pats[bi % pats.length]) list.push(rel(p, ch.bass, ch)); });
    add(sec.bass, lineEvents(list));
  }

  const drums = [];
  for (let b = 0; b < bars; b++) { const p = (sec.drums.fills && sec.drums.fills[b]) || sec.drums.pat; for (const ch of p) drums.push(ch); }
  const crash = new Set((sec.drums.crash || []).map(b => b * 16));
  return { steps, stepDur, chans, drums, crash, onStart: sec.onStart };
}
const DRUM = {
  k: (t, o) => osc(o, 'sine', 150, t, .13, .85, { to: 42, sustain: .3 }),
  s: (t, o) => { noiseHit(o, t, .12, .32, 'bandpass', 1900, .8); osc(o, 'triangle', 190, t, .06, .22, { to: 120 }); },
  h: (t, o) => noiseHit(o, t, .03, .1, 'highpass', 7000),
  o: (t, o) => noiseHit(o, t, .14, .1, 'highpass', 6000),
  r: (t, o) => noiseHit(o, t, .025, .2, 'bandpass', 3200, 4),
  c: (t, o) => noiseHit(o, t, .8, .16, 'highpass', 4500),
  T: (t, o) => osc(o, 'triangle', 200, t, .16, .55, { to: 85, sustain: .4 }),
  K: (t, o) => { osc(o, 'sine', 175, t, .18, 1, { to: 36, sustain: .35 }); noiseHit(o, t, .015, .3, 'highpass', 3000); },
  S: (t, o) => { noiseHit(o, t, .2, .5, 'bandpass', 1500, .7); noiseHit(o, t, .06, .16, 'highpass', 5000); osc(o, 'triangle', 165, t, .09, .32, { to: 100 }); },
};
const SFX = {
  slide: (t, o) => { const s = AC.createBufferSource(); s.buffer = NOISE; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(260, t + .45); const g = AC.createGain(); g.gain.setValueAtTime(.4, t); g.gain.exponentialRampToValueAtTime(.001, t + .5); s.connect(f).connect(g).connect(o); s.start(t); s.stop(t + .52); osc(o, 'p25', 700, t, .45, .07, { to: 70, sustain: .9 }); },
  snapslide: (t, o) => { SFX.snap(t, o); SFX.slide(t + .35, o); },
  snap: (t, o) => { noiseHit(o, t, .4, .45, 'highpass', 1800); osc(o, 'p25', 900, t, .5, .12, { to: 45, sustain: .9 }); } };

const TRACKS = {
  theme: { name: 'Unruggabull II', bpm: '152 BPM', loopFrom: 1, sections: [{
    bpm: 152, chords: ['Dm', 'Bb', 'C', 'A'],
    lead: { wave: 'p50', vol: .09, gate: .95, vib: true, notes: 'D5 - - - - - A4 - D5 - F5 - A5 - - - | Bb5 - - - A5 - G5 - F5 - - - E5 - - - | G5 - - - F5 - E5 - D5 - - - C5 - - - | C#5 - - - E5 - - - A5 - - - - - - -' },
    leads: [{ wave: 'p25', vol: .055, gate: .95, vib: true, harm: -2 }],
    riff: { wave: 'sawtooth', vol: .04, gate: .95, drive: true, pats: ['R - - - - - - - - - - - . . . .'] },
    arps: [{ wave: 'p12', vol: .028, gate: .6, mode: 'up' }],
    bass: { wave: 'triangle', vol: .3, gate: .9, pats: ['R - - - - - - - - - - - R . R .'] },
    drums: { pat: 'c.......T.T.TTTT', fills: { 3: 'c...T.T.TTSSSSSS' } },
  }, {
    bpm: 152, chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'],
    lead: { wave: 'p50', vol: .09, gate: .92, vib: true, notes: 'A4 - - D5 - - F5 - E5 - D5 - C5 - D5 - | F5 - - - - - D5 - Bb4 - - - C5 - D5 - | C5 - - F5 - - A5 - G5 - F5 - E5 - F5 - | G5 - - - - - - - E5 - - - C5 - - - | A4 - - D5 - - F5 - E5 - D5 - C5 - D5 - | F5 - - - - - G5 - A5 - - - Bb5 - A5 - | G5 - - - F5 - - - E5 - - - D5 - E5 - | C#5 - - - - - - - E5 - - - A5 - - -' },
    leads: [{ wave: 'p25', vol: .055, gate: .92, vib: true, harm: -2 }],
    riff: { wave: 'sawtooth', vol: .034, gate: .9, drive: true, pats: ['M . M M M . M M M . M M M . M M'] },
    arps: [{ wave: 'p12', vol: .028, gate: .55, mode: 'up' }],
    bass: { wave: 'triangle', vol: .3, gate: .8, pats: ['R . R . R . O . R . R . R . O .'] },
    drums: { pat: 'K.h.S.h.KKh.S.h.', fills: { 7: 'K.h.S.h.KKSSSSSS' }, crash: [0, 4] },
  }, {
    bpm: 152, chords: ['Bb', 'C', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A'],
    lead: { wave: 'p50', vol: .09, gate: .95, vib: true, notes: 'D6 - - - - - - - C6 - - - Bb5 - - - | C6 - - - - - - - G5 - - - E5 - - - | F5 - - - E5 - - - D5 - - - E5 - F5 - | A5 - - - - - - - - - - - - - - - | D6 - - - - - - - F6 - - - E6 - D6 - | E6 - - - - - - - C6 - - - G5 - - - | C#6 - - - - - - - - - - - E6 - - - | A5 - - - B5 - - - C#6 - - - E6 - - -' },
    leads: [{ wave: 'p25', vol: .05, gate: .95, vib: true, harm: -5 }],
    riff: { wave: 'sawtooth', vol: .034, gate: .95, drive: true, pats: ['R - - - - - - - R - - - - - - -'] },
    arps: [{ wave: 'p12', vol: .032, gate: .5, mode: 'updown' }, { wave: 'p12', vol: .02, gate: .95, mode: 'pad' }],
    bass: { wave: 'triangle', vol: .3, gate: .9, pats: ['R - - - - - - - R - - - O - - -'] },
    drums: { pat: 'K.......S.......', fills: { 6: 'K.......S...T.T.', 7: 'T.T.T.TTSSSSSSSS' }, crash: [0, 4] },
  }, {
    bpm: 152, transpose: 2, chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'],
    lead: { wave: 'p50', vol: .1, gate: .92, vib: true, notes: 'A4 - - D5 - - F5 - E5 - D5 - C5 - D5 - | F5 - - - - - D5 - Bb4 - - - C5 - D5 - | C5 - - F5 - - A5 - G5 - F5 - E5 - F5 - | G5 - - - - - - - E5 - - - C5 - - - | A4 - - D5 - - F5 - E5 - D5 - C5 - D5 - | F5 - - - - - G5 - A5 - - - Bb5 - A5 - | G5 - - - F5 - - - E5 - - - D5 - E5 - | C#5 - - - - - - - E5 - - - A5 - - -' },
    leads: [{ wave: 'p25', vol: .06, gate: .92, vib: true, harm: -2 }, { wave: 'p12', vol: .045, gate: .92, shift: -12 }],
    riff: { wave: 'sawtooth', vol: .034, gate: .9, drive: true, pats: ['M . M M M . M M M . M M M . M M'] },
    arps: [{ wave: 'p12', vol: .028, gate: .55, mode: 'updown' }],
    bass: { wave: 'triangle', vol: .3, gate: .8, pats: ['R . R . R . O . R . R . R . O .'] },
    drums: { pat: 'KKh.S.hKKKh.S.hK', fills: { 7: 'KKKKSSSSSSSSSSSS' }, crash: [0, 2, 4, 6] },
  }] },
  horns: { name: 'Horns Up', bpm: '100 to 168 BPM', loopFrom: 2, sections: [{
    bpm: 100, chords: ['Cmaj7', 'Dm7', 'Em7', 'Dm7'],
    lead: { wave: 'triangle', vol: .16, gate: .95, vib: true, notes: 'E5 - - - G5 - - - E5 - D5 - C5 - - - | D5 - - - F5 - - - D5 - C5 - A4 - - - | E5 - - - G5 - - - B5 - - - A5 - G5 - | F5 - - - - - - - D5 - - - - - - -' },
    arp: { wave: 'sine', vol: .05, gate: .95, mode: 'pad' },
    bass: { wave: 'triangle', vol: .22, gate: .7, pat: 'R . . . . . F . R . . . . . F .' },
    drums: { pat: '..r..r...r.r....' },
  }, {
    bpm: 168, onStart: 'snapslide', chords: ['Em', 'Em'],
    riff: { wave: 'p25', vol: .05, gate: .95, drive: true, oct: true, pats: ['R - - - - - - - +1 - - - - - - -', 'R - - - - - - - M M M M M M M M'] },
    bass: { wave: 'triangle', vol: .34, gate: .95, pats: ['R - - - - - - - +1 - - - - - - -', 'R - - - - - - - M M M M M M M M'] },
    drums: { pat: 'c.......c.......', fills: { 1: 'K.......KKKKSSSS' } },
  }, {
    bpm: 168, chords: ['Em', 'Em', 'Em', 'Em', 'Em', 'Em', 'Em', 'Em'],
    riff: { wave: 'p25', vol: .045, gate: .9, drive: true, oct: true, pats: ['M M . M M M . M +1 - - - M . +3 -', 'M M . M M M . M +6 - +5 - +3 - +1 -', 'M M . M M M . M +1 - - - M . +3 -', 'M M . M +7 - M M +10 - +7 - +5 - +6 -'] },
    lead: { wave: 'p50', vol: .085, gate: .92, vib: true, notes: '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | B5 - - - - - - - C6 - - - B5 - - - | G5 - - - F5 - - - E5 - - - - - - - | B5 - - - C6 - - - D6 - - - C6 - B5 - | Bb5 - - - A5 - - - G5 - - - F5 - - -' },
    bass: { wave: 'triangle', vol: .32, gate: .85, pats: ['M M . M M M . M +1 - - - M . +3 -', 'M M . M M M . M +6 - +5 - +3 - +1 -', 'M M . M M M . M +1 - - - M . +3 -', 'M M . M +7 - M M +10 - +7 - +5 - +6 -'] },
    drums: { pat: 'KKKKSKKKKKKKSKKK', fills: { 7: 'KKKKSKKKSSSSSSSS' }, crash: [0, 4] },
  }, {
    bpm: 168, chords: ['Em', 'Em', 'Em', 'Em'],
    riff: { wave: 'p25', vol: .05, gate: .95, drive: true, oct: true, pats: ['M . . M . . M . R - - - - - - -', 'M . . M . . M . R - - - - - - -', 'M . . M . . M . +1 - - - - - - -', 'M . . M . . M . +6 - - - +5 - - -'] },
    bass: { wave: 'triangle', vol: .34, gate: .95, pats: ['M . . M . . M . R - - - - - - -', 'M . . M . . M . R - - - - - - -', 'M . . M . . M . +1 - - - - - - -', 'M . . M . . M . +6 - - - +5 - - -'] },
    drums: { pat: 'K..K..K.S.......', fills: { 3: 'K..K..K.SSSSSSSS' }, crash: [0, 2] },
  }, {
    bpm: 168, chords: ['Em', 'F', 'Em', 'F', 'Em', 'F', 'G', 'A'],
    riff: { wave: 'p25', vol: .045, gate: .9, drive: true, oct: true, pats: ['M . M M M . M M M . M M M . M M'] },
    lead: { wave: 'p25', vol: .07, gate: .85, vib: true, notes: 'E5 G5 B5 E6 B5 G5 E5 G5 B5 E6 B5 G5 E5 G5 B5 E6 | F5 A5 C6 F6 C6 A5 F5 A5 C6 F6 C6 A5 F5 A5 C6 F6 | E5 G5 B5 E6 B5 G5 E5 G5 B5 E6 B5 G5 E5 G5 B5 E6 | F5 A5 C6 F6 C6 A5 F5 A5 C6 F6 C6 A5 F5 A5 C6 F6 | E6 - D6 - B5 - G5 - E5 - D5 - B4 - G4 - | F5 - E5 - C5 - A4 - F4 - E4 - F4 - A4 - | G5 - - - B5 - - - D6 - - - G6 - - - | A5 - - - - - - - - - - - - - - -' },
    bass: { wave: 'triangle', vol: .32, gate: .8, pats: ['M . M M M . M M M . M M M . M M'] },
    drums: { pat: 'KKKKSKKKKKKKSKKK', fills: { 7: 'KKKKSKKKSSSSSSSS' }, crash: [0, 4] },
  }] },
  alley: { name: 'Alley Redux', bpm: '168 BPM', sections: [{
    bpm: 168, chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'],
    lead: { wave: 'p50', vol: .1, gate: .9, vib: true, notes: 'A4 - - C5 - E5 - - A5 - - G5 - E5 - - | F5 - - E5 - C5 - - A4 - - C5 - F5 - - | G5 - - E5 - C5 - - G4 - - C5 - E5 - - | D5 - - B4 - G4 - - D5 - E5 - G5 - - - | A5 . A5 . G5 . E5 . A5 - - - C6 - B5 - | A5 . A5 . G5 . F5 . A5 - - - C6 - A5 - | G5 . G5 . E5 . C5 . G5 - - - E5 - G5 - | B5 - - - A5 - - - G5 - - - B5 - D6 -' },
    arp: { wave: 'p12', vol: .04, gate: .6, mode: 'up' },
    bass: { wave: 'triangle', vol: .3, gate: .85, pat: 'R - R O R - R O R - R O F - O -' },
    drums: { pat: 'k.h.s.h.k.k.s.hh', fills: { 7: 'k.h.s.h.k.k.ssss' }, crash: [0] },
  }] },
  tower: { name: 'RugCo Tower', bpm: '152 BPM', sections: [{
    bpm: 152, chords: ['Em', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B'],
    lead: { wave: 'p25', vol: .1, gate: .92, vib: true, notes: 'B4 - - - - - E5 - G5 - - - F#5 - E5 - | G5 - - - - - E5 - C5 - - - D5 - E5 - | F#5 - - - - - D5 - A4 - - - B4 - C5 - | B4 - - - - - - - - - - - E5 . E5 . | E5 - G5 - B5 - - - A5 - G5 - F#5 - E5 - | G5 - - - E5 - - - C6 - - - B5 - A5 - | A5 - - - F#5 - - - D6 - - - C6 - A5 - | B5 - - - - - - - D#5 - F#5 - B5 - - -' },
    arp: { wave: 'p12', vol: .035, gate: .55, mode: 'up' },
    bass: { wave: 'triangle', vol: .3, gate: .8, pat: 'R R O R R R O R R R O R R O F O' },
    drums: { pat: 'k.hhs.hhk.hhs.hh', fills: { 3: 'k.hhs.hhk.s.ssss', 7: 'k.hhs.hhk.s.ssss' }, crash: [0, 4] },
  }] },
  hold: { name: 'Please Hold', bpm: '100 to 184 BPM', sections: [{
    bpm: 100, chords: ['Cmaj7', 'Dm7', 'Em7', 'Dm7'],
    lead: { wave: 'triangle', vol: .16, gate: .95, vib: true, notes: 'E5 - - - G5 - - - E5 - D5 - C5 - - - | D5 - - - F5 - - - D5 - C5 - A4 - - - | E5 - - - G5 - - - B5 - - - A5 - G5 - | F5 - - - - - - - D5 - - - - - - -' },
    arp: { wave: 'sine', vol: .05, gate: .95, mode: 'pad' },
    bass: { wave: 'triangle', vol: .22, gate: .7, pat: 'R . . . . . F . R . . . . . F .' },
    drums: { pat: '..r..r...r.r....' },
  }, {
    bpm: 184, onStart: 'snap', chords: ['C', 'Dm', 'Em', 'Dm', 'C', 'Dm', 'Em', 'G'],
    lead: { wave: 'p50', vol: .1, gate: .88, vib: true, notes: 'E5 - - - G5 - - - E5 - D5 - C5 - - - | D5 - - - F5 - - - D5 - C5 - A4 - - - | E5 - - - G5 - - - B5 - - - A5 - G5 - | F5 - - - - - - - D5 - - - - - - - | E5 G5 C6 G5 E5 G5 C6 G5 E5 - D5 - C5 - - - | D5 F5 A5 F5 D5 F5 A5 F5 D5 - C5 - A4 - - - | E5 G5 B5 G5 E5 G5 B5 G5 B5 - - - A5 - G5 - | F5 - - - G5 - - - A5 - - - B5 - - -' },
    arp: { wave: 'p12', vol: .035, gate: .5, mode: 'updown' },
    bass: { wave: 'triangle', vol: .3, gate: .8, pat: 'R - O - R - O - R - O - R - O -' },
    drums: { pat: 'k.h.s.h.k.h.s.hk', fills: { 7: 'k.s.s.s.ssssssss' }, crash: [0, 4] },
  }] },
  weaver: { name: 'p(Loom)', bpm: '172 BPM', sections: [{
    bpm: 172, chords: ['Dm', 'Ddim', 'Bb', 'A', 'Dm', 'Ddim', 'Bb', 'A'],
    lead: { wave: 'p50', vol: .1, gate: .9, vib: true, notes: 'D5 - - - D5 - - - C#5 - D5 - F5 - - - | E5 - - - D5 - - - A4 - - - Bb4 - A4 - | D5 - - - F5 - - - Bb5 - - - A5 - F5 - | E5 - - - C#5 - - - A4 - - - C#5 - E5 - | A5 - - - A5 - - - G#5 - A5 - D6 - - - | C#6 - - - A5 - - - F5 - - - E5 - D5 - | F5 - G5 - A5 - Bb5 - D6 - - - C6 - Bb5 - | A5 - G5 - F5 - E5 - D5 - C#5 - D5 - - -' },
    arp: { wave: 'p12', vol: .035, gate: .55, mode: 'updown' },
    bass: { wave: 'triangle', vol: .32, gate: .75, pat: 'R . R R R . R R R . R R O . O O' },
    drums: { pat: 'kkh.s.kkkkh.s.kk', fills: { 7: 'kkh.s.kks.s.ssss' }, crash: [0, 4] },
  }] },
  bullrun: { name: 'Bull Run', bpm: '200 BPM', sections: [{
    bpm: 200, chords: ['C', 'F', 'G', 'C'],
    lead: { wave: 'p25', vol: .075, gate: .8, notes: 'C5 E5 G5 C6 G5 E5 C5 E5 G5 C6 G5 E5 C5 E5 G5 C6 | F5 A5 C6 F6 C6 A5 F5 A5 C6 F6 C6 A5 F5 A5 C6 F6 | G5 B5 D6 G6 D6 B5 G5 B5 D6 G6 D6 B5 G5 B5 D6 G6 | C6 - - - G5 - - - C6 - - - E6 - G6 -' },
    bass: { wave: 'triangle', vol: .3, gate: .8, pat: 'R O R O R O R O R O R O R O R O' },
    drums: { pat: 'khkhskhkkhkhskhk', crash: [0] },
  }] },
};

