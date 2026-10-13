// Unruggabull II sound: everything is synthesized with Web Audio, no audio files.
// Music runs on a small chip sequencer: two pulse leads, a pulse arpeggio, a triangle bass and noise drums,
// with an overdriven saw for the heavier parts (the title theme adds extra channels, VRC6 style).
// New tracks are plain pattern/order data (music-roof.js); the six section tracks below stay unchanged.
// Example: {bpm:160,key:'Dm',swing:0,loop:0,order:['A'],stems:['lead'],patterns:{A:{bars:1,
//   channels:{pulse1:{stem:'lead',wave:'pulse',duty:.25,vol:.07,notes:'D5 - F5 - A5 - D6 - . . . . . . . .'}}}}}.
// Notes: '-' holds, '.' rests, or {note:'D5',len:2,chord:['F5','A5'],vol:.06,envelope:{attack:.01,
// decay:.04,sustain:.5,release:.08},vibrato:{rate:6,depth:.01},arp:[0,7,12],slide:'A4',echo:{delay:.2,feedback:.25,repeats:2}}.
// Channel defaults accept those effects too. Noise notes k/s/h select pitch-drop kick, snare and hat.
// Add an object to UnrugRoofMusic or registerTrack(id,data). stems() applies on the next bar;
// music(id,{boundary:'bar'|'beat',slam:true}), music(null,{hard:true}), stinger(name), roofCue(name).
// A pattern channel with drive:true goes through the overdrive (Saga II's distorted power chords); one with
// synth:'classic' plays on the section tracks' own voice (Horns Up, written from its storyboard's sections).
// Roof cues: storm-only lead; fight downbeat; harmony/power added in rounds 2/3; a crashing power chord at each spool;
// hard cut at the last accounted word; the flood is the souls' own climbing notes (play('rush')) and the pinch sweep;
// heavy downbeat after the fusion freeze, with the beam's choir roar; 1% held D5; snap/dawn D-major chord, then quiet.
// Saga II is roofA; #music=b/c selects an earlier candidate.
// Characters talk in blips, one tone per letter, timed to match the caption as it types out.
// Browsers only allow audio after a tap or key press: `ready` is false until then, and `onready` is
// called whenever that changes so the Sound button can show what's really happening.
window.UnrugSound = (function () {
  'use strict';
  const KEY = 'unruggabull-ii-muted';
  const MUSIC_LEVEL = .5, DUCKED = .16;
  let ctx = null, master, musicBus, sfxBus, voiceBus, NOISE = null, want = null, wantOptions = {}, duckUntil = 0;
  const WAVES = {};
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

  const notify = () => { if (api.onready) api.onready(); };
  // iPhones only start audio when a sound is started inside the tap itself, so each unlock attempt plays one silent sample.
  function warm() { try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); s.connect(ctx.destination); s.start(0); } catch (e) {} }
  function wake() { warm(); const p = ctx.resume(); if (p && p.then) p.then(notify, () => {}); }

  function init() {
    if (ctx) { if (ctx.state !== 'running') wake(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { ctx = null; return false; }
    ctx.onstatechange = notify;
    if (ctx.state !== 'running') wake(); else warm();
    setTimeout(notify, 0);
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = MUSIC_LEVEL; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = .7; sfxBus.connect(master);
    voiceBus = ctx.createGain(); voiceBus.gain.value = .9;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
    voiceBus.connect(lp); lp.connect(master);
    // NES-style pulse waves at 12.5%, 25% and 50% duty
    for (const [k, d] of [['p12', .125], ['p25', .25], ['p50', .5]]) {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let i = 1; i < n; i++) re[i] = 2 / (i * Math.PI) * Math.sin(i * Math.PI * d);
      WAVES[k] = ctx.createPeriodicWave(re, im);
    }
    NOISE = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = NOISE.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    if (want) playTrack(want, wantOptions);
    roofSound(roofWant);
    return true;
  }

  function osc(dest, wave, f, t, dur, vol, o = {}) {
    const s = ctx.createOscillator();
    if (WAVES[wave]) s.setPeriodicWave(WAVES[wave]); else s.type = wave;
    s.frequency.setValueAtTime(f, t);
    if (o.to) s.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const g = ctx.createGain(), a = o.attack || .004, end = t + Math.max(.02, dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.linearRampToValueAtTime(vol * (o.sustain == null ? .7 : o.sustain), Math.max(t + a, end - .015)); g.gain.linearRampToValueAtTime(.0001, end);
    if (o.vib && dur > .15) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.5; lg.gain.value = f * .012; l.connect(lg); lg.connect(s.frequency); l.start(t + .1); l.stop(end + .02); }
    s.connect(g); g.connect(dest); s.start(t); s.stop(end + .03);
    return s;
  }
  function noiseHit(dest, t, dur, vol, type, freq, q = 1, to) {
    const s = ctx.createBufferSource(); s.buffer = NOISE;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }

  // ---------- the chip sequencer ----------
  // A track is a list of sections. Each section has chords (one per bar of 16 steps), a lead line written as notes,
  // harmony leads (`harm` moves the lead n scale steps, `shift` n semitones), arpeggios over the chords, a power-chord
  // riff and a bass written as patterns (R root, O octave, F fifth, M palm-muted root, +n semitones), and drums with one
  // character per step: k kick, s snare, h hat, o open hat, r rim, c crash, K and S heavy kick and snare, T tom.
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
  const D_MINOR = [0, 2, 4, 5, 7, 9, 10], E_MINOR = [4, 6, 7, 9, 11, 0, 2];
  function dia(m, steps, scale) {
    const pcs = [...scale].sort((a, b) => a - b), n = pcs.length, oct = Math.floor(m / 12), pc = ((m % 12) + 12) % 12;
    let idx = pcs.indexOf(pc);
    if (idx < 0) for (let d = 1; d < 12; d++) { const k = pcs.indexOf((pc - d + 12) % 12); if (k >= 0) { idx = k; break; } }
    const total = oct * n + idx + steps, o2 = Math.floor(total / n), i2 = ((total % n) + n) % n;
    return o2 * 12 + pcs[i2];
  }
  function compile(sec) {
    const bars = sec.chords.length, steps = bars * 16, stepDur = 60 / sec.bpm / 4, tr = sec.transpose || 0, chans = [];
    const add = (cfg, evs) => { const byStep = {}; for (const e0 of evs) { const e = tr ? Object.assign({}, e0, { m: e0.m + tr }) : e0; (byStep[e.step] = byStep[e.step] || []).push(e); } chans.push(Object.assign({}, cfg, { byStep })); };
    const lineEvents = list => { const evs = []; let last = null; list.forEach((tk, i) => { if (tk === '-') { if (last) last.len++; } else if (tk === '.') last = null; else { const o = typeof tk === 'object' ? tk : { m: typeof tk === 'number' ? tk : midi(tk) }; last = { step: i, len: 1, m: o.m, g: o.g }; evs.push(last); } }); return evs; };
    const rel = (p, root, ch) => p === '-' || p === '.' ? p : p === 'R' ? root : p === 'M' ? { m: root, g: .3 } : p === 'O' ? root + 12 : p === 'F' ? root + 7 : p === 'T' ? root + ch.iv[1] : /^\+\d+$/.test(p) ? root + (+p.slice(1)) : p;
    const patsOf = c => (c.pats || [c.pat]).map(toks);
    let leadEvs = null;
    if (sec.lead) { leadEvs = lineEvents(toks(sec.lead.notes)); add(sec.lead, leadEvs); }
    if (sec.leads && leadEvs) for (const L of sec.leads) add(L, leadEvs.map(e => Object.assign({}, e, { m: L.harm ? dia(e.m, L.harm, sec.scale || D_MINOR) : e.m + (L.shift || 0) })));
    if (sec.riff) {
      const pats = patsOf(sec.riff), list = [];
      sec.chords.forEach((c, bi) => { const ch = chordOf(c), pc = (ch.bass % 12 + 12) % 12, r = 40 + ((pc - 4 + 12) % 12); for (const p of pats[bi % pats.length]) list.push(rel(p, r, ch)); });
      const evs = [];
      for (const e of lineEvents(list)) { evs.push(e, Object.assign({}, e, { m: e.m + 7 })); if (sec.riff.oct) evs.push(Object.assign({}, e, { m: e.m + 12 })); }
      add(sec.riff, evs);
    }
    for (const A of [sec.arp].concat(sec.arps || []).filter(Boolean)) {
      const evs = [];
      sec.chords.forEach((c, b) => {
        const ch = chordOf(c), tones = ch.iv.concat([12]).map(v => ch.arp + v);
        if (A.mode === 'pad') { for (const n of ch.iv) evs.push({ step: b * 16, len: 16, m: ch.arp + n }); return; }
        const seq = A.mode === 'updown' ? tones.concat(tones.slice(1, -1).reverse()) : tones;
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
    return { steps, stepDur, chans, drums, crash: new Set((sec.drums.crash || []).map(b => b * 16)) };
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
    S: (t, o) => { noiseHit(o, t, .2, .5, 'bandpass', 1500, .7); noiseHit(o, t, .06, .16, 'highpass', 5000); osc(o, 'triangle', 165, t, .09, .32, { to: 100 }); }
  };

  const TOWER_LEAD = 'B4 - - - - - E5 - G5 - - - F#5 - E5 - | G5 - - - - - E5 - C5 - - - D5 - E5 - | F#5 - - - - - D5 - A4 - - - B4 - C5 - | B4 - - - - - - - - - - - E5 . E5 . | E5 - G5 - B5 - - - A5 - G5 - F#5 - E5 - | G5 - - - E5 - - - C6 - - - B5 - A5 - | A5 - - - F#5 - - - D6 - - - C6 - A5 - | B5 - - - - - - - D#5 - F#5 - B5 - - -';
  const THEME_VERSE = 'A4 - - D5 - - F5 - E5 - D5 - C5 - D5 - | F5 - - - - - D5 - Bb4 - - - C5 - D5 - | C5 - - F5 - - A5 - G5 - F5 - E5 - F5 - | G5 - - - - - - - E5 - - - C5 - - - | A4 - - D5 - - F5 - E5 - D5 - C5 - D5 - | F5 - - - - - G5 - A5 - - - Bb5 - A5 - | G5 - - - F5 - - - E5 - - - D5 - E5 - | C#5 - - - - - - - E5 - - - A5 - - -';
  const TRACKS = {
    // Title: the main theme. An intro bar, a verse, a soaring chorus, and the verse again a step higher.
    theme: { loopFrom: 1, sections: [{
      bpm: 152, chords: ['Dm', 'Bb', 'C', 'A'],
      lead: { wave: 'p50', vol: .09, gate: .95, vib: true, notes: 'D5 - - - - - A4 - D5 - F5 - A5 - - - | Bb5 - - - A5 - G5 - F5 - - - E5 - - - | G5 - - - F5 - E5 - D5 - - - C5 - - - | C#5 - - - E5 - - - A5 - - - - - - -' },
      leads: [{ wave: 'p25', vol: .055, gate: .95, vib: true, harm: -2 }],
      riff: { wave: 'sawtooth', vol: .04, gate: .95, drive: true, pats: ['R - - - - - - - - - - - . . . .'] },
      arps: [{ wave: 'p12', vol: .028, gate: .6, mode: 'up' }],
      bass: { wave: 'triangle', vol: .3, gate: .9, pats: ['R - - - - - - - - - - - R . R .'] },
      drums: { pat: 'c.......T.T.TTTT', fills: { 3: 'c...T.T.TTSSSSSS' } }
    }, {
      bpm: 152, chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'],
      lead: { wave: 'p50', vol: .09, gate: .92, vib: true, notes: THEME_VERSE },
      leads: [{ wave: 'p25', vol: .055, gate: .92, vib: true, harm: -2 }],
      riff: { wave: 'sawtooth', vol: .034, gate: .9, drive: true, pats: ['M . M M M . M M M . M M M . M M'] },
      arps: [{ wave: 'p12', vol: .028, gate: .55, mode: 'up' }],
      bass: { wave: 'triangle', vol: .3, gate: .8, pats: ['R . R . R . O . R . R . R . O .'] },
      drums: { pat: 'K.h.S.h.KKh.S.h.', fills: { 7: 'K.h.S.h.KKSSSSSS' }, crash: [0, 4] }
    }, {
      bpm: 152, chords: ['Bb', 'C', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A'],
      lead: { wave: 'p50', vol: .09, gate: .95, vib: true, notes: 'D6 - - - - - - - C6 - - - Bb5 - - - | C6 - - - - - - - G5 - - - E5 - - - | F5 - - - E5 - - - D5 - - - E5 - F5 - | A5 - - - - - - - - - - - - - - - | D6 - - - - - - - F6 - - - E6 - D6 - | E6 - - - - - - - C6 - - - G5 - - - | C#6 - - - - - - - - - - - E6 - - - | A5 - - - B5 - - - C#6 - - - E6 - - -' },
      leads: [{ wave: 'p25', vol: .05, gate: .95, vib: true, harm: -5 }],
      riff: { wave: 'sawtooth', vol: .034, gate: .95, drive: true, pats: ['R - - - - - - - R - - - - - - -'] },
      arps: [{ wave: 'p12', vol: .032, gate: .5, mode: 'updown' }, { wave: 'p12', vol: .02, gate: .95, mode: 'pad' }],
      bass: { wave: 'triangle', vol: .3, gate: .9, pats: ['R - - - - - - - R - - - O - - -'] },
      drums: { pat: 'K.......S.......', fills: { 6: 'K.......S...T.T.', 7: 'T.T.T.TTSSSSSSSS' }, crash: [0, 4] }
    }, {
      bpm: 152, transpose: 2, chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'],
      lead: { wave: 'p50', vol: .1, gate: .92, vib: true, notes: THEME_VERSE },
      leads: [{ wave: 'p25', vol: .06, gate: .92, vib: true, harm: -2 }, { wave: 'p12', vol: .045, gate: .92, shift: -12 }],
      riff: { wave: 'sawtooth', vol: .034, gate: .9, drive: true, pats: ['M . M M M . M M M . M M M . M M'] },
      arps: [{ wave: 'p12', vol: .028, gate: .55, mode: 'updown' }],
      bass: { wave: 'triangle', vol: .3, gate: .8, pats: ['R . R . R . O . R . R . R . O .'] },
      drums: { pat: 'KKh.S.hKKKh.S.hK', fills: { 7: 'KKKKSSSSSSSSSSSS' }, crash: [0, 2, 4, 6] }
    }] },
    // Floor 13, the hall.
    tower: { sections: [{
      bpm: 152, chords: ['Em', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B'],
      lead: { wave: 'p25', vol: .1, gate: .92, vib: true, notes: TOWER_LEAD },
      arp: { wave: 'p12', vol: .035, gate: .55, mode: 'up' },
      bass: { wave: 'triangle', vol: .3, gate: .8, pat: 'R R O R R R O R R R O R R O F O' },
      drums: { pat: 'k.hhs.hhk.hhs.hh', fills: { 3: 'k.hhs.hhk.s.ssss', 7: 'k.hhs.hhk.s.ssss' }, crash: [0, 4] }
    }] },
    // All Staff: Alley Redux, the first game's alley tune at full tilt.
    staff: { sections: [{
      bpm: 168, chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'],
      lead: { wave: 'p50', vol: .1, gate: .9, vib: true, notes: 'A4 - - C5 - E5 - - A5 - - G5 - E5 - - | F5 - - E5 - C5 - - A4 - - C5 - F5 - - | G5 - - E5 - C5 - - G4 - - C5 - E5 - - | D5 - - B4 - G4 - - D5 - E5 - G5 - - - | A5 . A5 . G5 . E5 . A5 - - - C6 - B5 - | A5 . A5 . G5 . F5 . A5 - - - C6 - A5 - | G5 . G5 . E5 . C5 . G5 - - - E5 - G5 - | B5 - - - A5 - - - G5 - - - B5 - D6 -' },
      leads: [{ wave: 'p25', vol: .045, gate: .9, vib: true, harm: -2 }],
      scale: [9, 11, 0, 2, 4, 5, 7],
      arp: { wave: 'p12', vol: .04, gate: .6, mode: 'up' },
      bass: { wave: 'triangle', vol: .3, gate: .85, pat: 'R - R O R - R O R - R O F - O -' },
      drums: { pat: 'k.h.s.h.k.k.s.hh', fills: { 7: 'k.h.s.h.k.k.ssss' }, crash: [0, 4] }
    }] },
    // Lights out: just a bass line, a far-off arpeggio and a heartbeat.
    dark: { sections: [{
      bpm: 96, chords: ['Em', 'Em', 'C', 'B'],
      arp: { wave: 'p12', vol: .018, gate: .3, mode: 'up' },
      bass: { wave: 'triangle', vol: .3, gate: .5, pat: 'R . . . . . . . R . . . . . F .' },
      drums: { pat: 'k..k............' }
    }] },
    // Copy Room: the tower tune three steps up and faster, with the saw chugging under it.
    copy: { sections: [{
      bpm: 164, transpose: 3, scale: E_MINOR, chords: ['Em', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B'],
      lead: { wave: 'p25', vol: .1, gate: .9, vib: true, notes: TOWER_LEAD },
      leads: [{ wave: 'p12', vol: .04, gate: .9, shift: -12 }],
      riff: { wave: 'sawtooth', vol: .028, gate: .9, drive: true, pats: ['M . . M . . M . M . . M . M M .'] },
      arp: { wave: 'p12', vol: .03, gate: .5, mode: 'updown' },
      bass: { wave: 'triangle', vol: .3, gate: .8, pat: 'R R O R R R O R R R O R R O F O' },
      drums: { pat: 'k.hhs.hkk.hhs.hh', fills: { 3: 'k.hhs.hhk.s.ssss', 7: 'k.s.s.s.ssssssss' }, crash: [0, 4] }
    }] },
    // The Shredder: the tower tune a half step up, faster, with a chugging saw and heavy drums.
    shred: { sections: [{
      bpm: 168, transpose: 1, scale: E_MINOR, chords: ['Em', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B'],
      lead: { wave: 'p50', vol: .09, gate: .9, vib: true, notes: TOWER_LEAD },
      leads: [{ wave: 'p25', vol: .05, gate: .9, vib: true, harm: -2 }],
      riff: { wave: 'sawtooth', vol: .034, gate: .9, drive: true, pats: ['M . M M M . M M M . M M M . M M'] },
      bass: { wave: 'triangle', vol: .32, gate: .8, pat: 'R R O R R R O R R R O R R O F O' },
      drums: { pat: 'KKh.S.hKKKh.S.hK', fills: { 3: 'KKh.S.hKKKSSSSSS', 7: 'KKKKSSSSSSSSSSSS' }, crash: [0, 4] }
    }] }
  };
  Object.assign(TRACKS, window.UnrugRoofMusic || {}, window.UnrugElevatorMusic || {}, window.UnrugFloorMusic || {}, window.UnrugFactoryMusic || {});
  if (TRACKS.roofA) { TRACKS.roof = TRACKS.roofA; TRACKS.roofHeavy = TRACKS.roofAHeavy; }
  // Pattern format is opt-in: the original six section tracks retain their exact compiler and synth.
  function noteEvents(notes) {
    const list = typeof notes === 'string' ? toks(notes) : notes, events = []; let step = 0, last;
    for (const token of list) {
      if (token === '-') { if (last) last.len++; step++; continue; }
      if (token === '.') { last = null; step++; continue; }
      const data = typeof token === 'object' ? Object.assign({}, token) : { note: token };
      last = Object.assign(data, { step, len: data.len || 1 }); events.push(last); step += last.len;
    }
    return events;
  }
  function compilePatterns(track) {
    if (!(track.bpm > 0) || !track.order.length || track.loop < 0 || track.loop >= track.order.length) throw new Error('Invalid track tempo/order/loop');
    return track.order.map(name => {
      const pattern = track.patterns[name]; if (!pattern) throw new Error('Missing pattern ' + name);
      const chans = Object.entries(pattern.channels).map(([name, cfg]) => {
        const byStep = {}; for (const e of noteEvents(cfg.notes)) {
          if (e.step + e.len > pattern.bars * 16) throw new Error('Notes exceed pattern: ' + name);
          (byStep[e.step] = byStep[e.step] || []).push(e);
        }
        return Object.assign({ name, stem: name }, cfg, { byStep });
      });
      return { steps: pattern.bars * 16, stepDur: 60 / (pattern.bpm || track.bpm) / 4, swing: Math.max(0, Math.min(.45, pattern.swing || track.swing || 0)), chans };
    });
  }
  function chipTone(dest, channel, event, t, duration, pitch, volume) {
    const cfg = Object.assign({}, channel, event), envelope = Object.assign({ attack: .004, decay: .03, sustain: .65, release: .025 }, channel.envelope, event.envelope);
    const tone = ctx.createOscillator(), gain = ctx.createGain();
    const wave = cfg.wave === 'pulse' ? (cfg.duty === .125 ? 'p12' : cfg.duty === .5 ? 'p50' : 'p25') : cfg.wave || 'triangle';
    if (WAVES[wave]) tone.setPeriodicWave(WAVES[wave]); else tone.type = wave;
    tone.detune.value = cfg.detune || 0;
    const f = hz(pitch), slide = cfg.slide, arp = cfg.arp;
    tone.frequency.setValueAtTime(f, t);
    if (typeof slide === 'string') tone.frequency.exponentialRampToValueAtTime(hz(midi(slide)), t + duration);
    else if (slide) { tone.frequency.setValueAtTime(f * Math.pow(2, slide.semitones / 12), t); tone.frequency.exponentialRampToValueAtTime(f, t + Math.min(duration, slide.seconds || duration)); }
    if (arp && arp.length) for (let j = 0, q = 0; q < duration; j++, q += 1 / (cfg.arpHz || 16)) tone.frequency.setValueAtTime(f * Math.pow(2, arp[j % arp.length] / 12), t + q);
    const attack = Math.min(duration * .4, envelope.attack), decay = Math.min(duration * .4, envelope.decay), release = Math.max(.005, envelope.release), end = t + duration + release;
    gain.gain.setValueAtTime(.0001, t); gain.gain.linearRampToValueAtTime(volume, t + attack);
    gain.gain.linearRampToValueAtTime(Math.max(.0001, volume * envelope.sustain), t + attack + decay);
    gain.gain.setValueAtTime(Math.max(.0001, volume * envelope.sustain), t + duration); gain.gain.exponentialRampToValueAtTime(.0001, end);
    if (cfg.vibrato) {
      const v = cfg.vibrato, lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = v.rate || 5.5; depth.gain.value = f * (v.depth || .01);
      lfo.connect(depth); depth.connect(tone.frequency); lfo.start(t + Math.min(duration, v.delay || 0)); lfo.stop(end); lfo.onended = () => { lfo.disconnect(); depth.disconnect(); };
    }
    tone.connect(gain); gain.connect(dest); tone.start(t); tone.stop(end + .01); tone.onended = () => { tone.disconnect(); gain.disconnect(); };
  }
  function patternNote(dest, channel, event, t, stepDur) {
    // synth 'classic': the section tracks' own voice (osc tones, the DRUM letters) for a track written from them
    if (channel.synth === 'classic') {
      if (channel.wave === 'noise') { if (DRUM[event.note]) DRUM[event.note](t, dest); return; }
      const d = event.len * stepDur * (event.gate || channel.gate || .9);
      for (const n of [event.note].concat(event.chord || [])) osc(dest, channel.wave, hz(typeof n === 'number' ? n : midi(n)), t, d, channel.vol, { vib: channel.vib });
      return;
    }
    if (channel.wave === 'noise') {
      const preset = { k: 'K', K: 'K', s: 's', S: 'S', h: 'h', H: 'o', c: 'c', T: 'T' }[event.note];
      if (!preset) return;
      const out = ctx.createGain(), vol = event.vol == null ? (channel.vol == null ? .5 : channel.vol) : event.vol, env = Object.assign({attack:.001,decay:.04,sustain:.7,release:.06},channel.envelope,event.envelope);
      if (!(vol > 0)) return;
      out.gain.setValueAtTime(.0001,t); out.gain.linearRampToValueAtTime(vol,t+env.attack); out.gain.linearRampToValueAtTime(Math.max(.0001,vol*env.sustain),t+env.attack+env.decay); out.gain.setValueAtTime(Math.max(.0001,vol*env.sustain),t+Math.max(env.attack+env.decay,event.len*stepDur)); out.gain.exponentialRampToValueAtTime(.0001,t+Math.max(env.attack+env.decay,event.len*stepDur)+env.release); out.connect(dest); DRUM[preset](t, out);
      // Disconnect after the longest preset tail; no interval or source remains.
      const tail = ctx.createOscillator(); tail.connect(ctx.createGain()); tail.start(t); tail.stop(t + 1); tail.onended = () => out.disconnect(); return;
    }
    const duration = event.len * stepDur * (event.gate || channel.gate || .9), pitches = [event.note].concat(event.chord || []).map(n => typeof n === 'number' ? n : midi(n));
    const vol = event.vol == null ? (channel.vol == null ? .07 : channel.vol) : event.vol, echo = event.echo === undefined ? channel.echo : event.echo;
    if (!(vol > 0)) return;
    for (const pitch of pitches) {
      chipTone(dest, channel, event, t, duration, pitch, vol);
      if (echo) for (let i = 1; i <= Math.min(4, echo.repeats == null ? 1 : echo.repeats); i++) {
        const level = vol * Math.pow(echo.feedback == null ? .25 : echo.feedback, i);
        if (level > 0) chipTone(dest, channel, event, t + i * (echo.delay || .2), duration, pitch, level);
      }
    }
  }
  function restoreDuck() { if (duckUntil && ctx.currentTime > duckUntil) { duckUntil = 0; musicBus.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime, .08); } }
  function pumpPatterns() {
    while (P.id && P.next < ctx.currentTime + .12) {
      if (P.pendingTrack && P.step % (P.pendingTrack.boundary === 'beat' ? 4 : 16) === 0) {
        const next = P.pendingTrack, at = P.next; P.pendingTrack = null; playTrack(next.id, Object.assign({}, next.options, { at, slam: true })); return;
      }
      if (P.step % 16 === 0) {
        if (P.pendingStems) { P.stems = P.pendingStems; P.pendingStems = null; }
        if (P.pendingTempo) { P.rate = P.pendingTempo; P.pendingTempo = 0; }
      }
      const S = P.comp[P.si], t = P.next, duration = S.stepDur / P.rate;
      for (const ch of S.chans) if (P.stems.has(ch.stem)) for (const e of ch.byStep[P.step] || []) patternNote(ch.drive ? P.drive : P.out, ch, e, t, duration);
      P.next += duration * (P.step % 2 ? 1 - S.swing : 1 + S.swing); P.step++;
      if (P.step >= S.steps) { P.step = 0; P.si = P.patternLoop == null ? (P.si + 1 < P.comp.length ? P.si + 1 : P.loopFrom) : P.patternLoop; }
    }
    restoreDuck();
  }
  const P = { id: null, comp: null, si: 0, step: 0, next: 0, timer: 0, out: null, drive: null, loopFrom: 0, rate: 1, modern: false, patternLoop: null, stems: new Set(), pendingStems: null, pendingTempo: 0, pendingTrack: null };   // rate: tempo multiplier (a rally speeds the music up)
  function stopTrack(hard = false, at) {
    P.pendingTrack = null; P.pendingStems = null; P.pendingTempo = 0;
    if (!P.id) return;
    clearInterval(P.timer); P.timer = 0;
    if (P.out && ctx) { const o = P.out; if (hard || /^roof/.test(P.id)) { const cut = at == null ? ctx.currentTime : at; o.gain.cancelScheduledValues(cut); o.gain.setValueAtTime(0, cut); } else o.gain.setTargetAtTime(0, ctx.currentTime, .03); setTimeout(() => { try { o.disconnect(); if (o.brownout) o.brownout.disconnect(); } catch (e) {} }, 400); }
    P.id = null; P.out = null;
  }
  function playTrack(id, options = {}) {
    stopTrack(!!options.slam, options.at);
    if (!ctx || !TRACKS[id]) return;
    const tr = TRACKS[id];
    tr.comp = tr.comp || (tr.patterns ? compilePatterns(tr) : tr.sections.map(compile));
    P.id = id; P.comp = tr.comp; P.loopFrom = tr.patterns ? tr.loop || 0 : tr.loopFrom || 0; P.si = 0; P.step = 0; P.next = options.at == null ? ctx.currentTime + (options.slam ? .005 : .08) : options.at;
    P.patternLoop = null;
    if (tr.patterns) {
      const pattern = options.pattern || tr.startPattern;
      if (pattern) {
        const index = tr.order.indexOf(pattern);
        if (index < 0) throw new Error('Missing start pattern ' + pattern);
        P.si = index;
        if (options.loopPattern || tr.holdPattern) P.patternLoop = index;
      }
    }
    P.modern = !!tr.patterns; P.stems = new Set(options.stems || tr.stems || []);
    if (P.modern) { P.next = options.at == null ? ctx.currentTime + .005 : options.at; P.rate = 1; }
    P.out = ctx.createGain(); P.out.gain.value = 1; P.out.connect(musicBus);
    // Overdrive for the saw riff: gain into tanh, a speaker-cabinet low-pass, then back down.
    P.drive = ctx.createGain(); P.drive.gain.value = 8;
    const shaper = ctx.createWaveShaper(), curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) curve[i] = Math.tanh(4 * (i / 511.5 - 1));
    shaper.curve = curve;
    const cab = ctx.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = 3800;
    const post = ctx.createGain(); post.gain.value = .26;
    P.drive.connect(shaper); shaper.connect(cab); cab.connect(post); post.connect(P.out);
    P.timer = setInterval(pump, 25); pump();
  }
  function pump() {
    if (!P.id || !ctx) return;
    if (P.modern) { if (P.next < ctx.currentTime - .1) P.next = ctx.currentTime + .005; pumpPatterns(); return; }
    if (P.next < ctx.currentTime - .1) P.next = ctx.currentTime + .05;
    while (P.next < ctx.currentTime + .12) {
      if (P.pendingTrack && P.step % (P.pendingTrack.boundary === 'beat' ? 4 : 16) === 0) { const next = P.pendingTrack, at = P.next; playTrack(next.id, Object.assign({}, next.options, { at, slam: true })); return; }
      const S = P.comp[P.si], t = P.next, stepDur = S.stepDur / P.rate;
      for (const ch of S.chans) { const evs = ch.byStep[P.step]; if (evs) for (const e of evs) osc(ch.drive ? P.drive : P.out, ch.wave, hz(e.m), t, e.len * stepDur * (e.g || ch.gate || .9), ch.vol, { vib: ch.vib }); }
      const d = S.drums[P.step]; if (DRUM[d]) DRUM[d](t, P.out);
      if (S.crash.has(P.step)) DRUM.c(t, P.out);
      P.next += stepDur; P.step++;
      if (P.step >= S.steps) { P.step = 0; P.si = P.si + 1 < P.comp.length ? P.si + 1 : P.loopFrom; }
    }
    if (duckUntil && ctx.currentTime > duckUntil) { duckUntil = 0; musicBus.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime, .08); }
  }

  let musicFx = null, roofChoice = 'a';
  function fxBus() { if (!musicFx) { musicFx = ctx.createGain(); musicFx.connect(musicBus); } return musicFx; }
  function stopMusicFx() { if (!ctx || !musicFx) return; const out = musicFx; out.gain.setValueAtTime(0, ctx.currentTime); musicFx = null; setTimeout(() => out.disconnect(), 6000); }
  function stinger(name) {
    if (!ctx || ctx.state !== 'running') return;
    const tr = TRACKS[P.id || want] || TRACKS['roof' + roofChoice.toUpperCase()], data = tr && tr.stingers && tr.stingers[name]; if (!data) return;
    const stepDur = 60 / data.bpm / 4, at = ctx.currentTime + .005;
    for (const e of noteEvents(data.notes)) patternNote(fxBus(), data, e, at + e.step * stepDur, stepDur);
  }
  // A spool snaps: one distorted power chord on D with a heavy kick and a crash, on the music's overlay bus
  // so the hard cut silences it like the rest of the music.
  function spoolHit() {
    if (!ctx || ctx.state !== 'running') return;
    restoreDuck(); const out = fxBus(), t = ctx.currentTime + .005;
    const d = ctx.createGain(), sh = shaper(3), lp = ctx.createBiquadFilter(), post = ctx.createGain();
    d.gain.value = 4; lp.type = 'lowpass'; lp.frequency.value = 3500; post.gain.value = .3;
    d.connect(sh); sh.connect(lp); lp.connect(post); post.connect(out);
    for (const m of [50, 57, 62]) osc(d, 'p25', hz(m), t, 1.1, .3, { sustain: .6 });
    DRUM.K(t, out); DRUM.c(t, out); noiseHit(out, t, 1.2, .3, 'highpass', 4000);
    setTimeout(() => [d, sh, lp, post].forEach(n => n.disconnect()), 2500);
  }
  function riser(seconds = 4) {
    if (!ctx || ctx.state !== 'running') return;
    restoreDuck(); stopMusicFx(); const out = fxBus(), t = ctx.currentTime + .005;
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(1, t + seconds);
    osc(out, 'sawtooth', hz(38), t, seconds, .08, { to: hz(74), attack: .01, sustain: 1 });
    noiseHit(out, t, seconds, .12, 'bandpass', 140, .7, 4200);
    for (let i = 0; i < seconds * 8; i++) osc(out, 'p12', hz([62,65,69,74][i % 4]), t + i / 8, .1, .025);
  }
  // Floor 48's cues. Candidates A/B/C (music-factory.js); each has an intro (the factory alone), a fight and a heavy.
  // intro: the intro, held; fight: the fight on the next bar with drums, bass, lead and the machine; panic: the first
  // line is down (harmony and power join, a little faster); heavy: the second line is down (the heavy version slams
  // in); fuse: the streams start to bend in (a riser over the music); spoil: p(Loom) breaks them (hard cut, sour chord).
  let factoryChoice = 'b';   // Assembly Line, the owner's pick (Oct 12)
  function factoryCue(name, options = {}) {
    if (options.candidate) factoryChoice = /^[abc]$/.test(options.candidate) ? options.candidate : 'b';
    const id = 'factory' + factoryChoice.toUpperCase(), base = ['drums', 'bass', 'lead', 'machine'];
    if (name === 'intro') api.music(id + 'Intro', { slam: true });
    else if (name === 'fight') { if (P.id === id + 'Intro') api.music(id, { boundary: 'bar', stems: base }); else api.music(id, { slam: true, stems: base }); api.tempo(1); }
    else if (name === 'panic') { if (want !== id) api.music(id, { slam: true, stems: base.concat(['harmony', 'power']) }); else api.stems(base.concat(['harmony', 'power'])); api.tempo(1.05); }
    else if (name === 'heavy') api.music(id + 'Heavy', { slam: true });   // play('lineDown') after it, so its chord isn't cut
    else if (name === 'fuse') riser(options.seconds || 2.5);
    else if (name === 'spoil') { api.music(null, { hard: true }); api.play('sour'); }
  }
  function roofCue(name, options = {}) {
    if (options.candidate) roofChoice = /^[abc]$/.test(options.candidate) ? options.candidate : 'a';
    const id = 'roof' + roofChoice.toUpperCase(), base = ['drums', 'bass', 'lead'];
    if (name === 'lead' || name === 'quiet' || name === 'cut') { api.music(null, { hard: true }); return; }
    if (name === 'fight') { stopMusicFx(); api.music(id, { slam: true, stems: base }); }
    else if (name === 'round2' || name === 'round3') {
      const stems = base.concat(name === 'round3' ? ['harmony', 'power'] : ['harmony']);
      if (want !== id) api.music(id, { slam: true, stems }); else api.stems(stems);
    }
    else if (name === 'spool') spoolHit();
    else if (name === 'flood') stopMusicFx();   // the souls play the flood themselves: play('rush', n), then play('pinch')
    else if (name === 'fusion') { stopMusicFx(); api.music(id + 'Heavy', { slam: true }); }
    else if (name === 'one') { api.music(null, { hard: true }); if (ctx) osc(fxBus(), 'p50', hz(74), ctx.currentTime + .005, options.seconds || 2, .09, { attack: .015, sustain: .9 }); }
    else if (name === 'snap' || name === 'dawn') { api.music(null, { hard: true }); if (!options.continueChord) api.play('chord'); }
  }
  // ---------- blip talk ----------
  const VOICES = {
    loom: { f: 96, wave: 'p12', ms: 38 }, // Keep the original fallback's caption cadence.
    operator: { f: 210, wave: 'triangle', ms: 55 },
    narrator: { f: 392, wave: 'triangle', ms: 40 },
    shredder: { f: 140, wave: 'sawtooth', ms: 40 },
    announcer: { f: 620, wave: 'p25', ms: 38 },
    bull: { f: 165, wave: 'p50', ms: 46 }
  };
  // When each character of a line appears, in seconds from the start, and how long the whole line takes.
  // The game types captions with these times, so it works the same with sound off.
  function talkTimes(text, who) {
    const V = VOICES[who] || VOICES.announcer, times = [];
    let t = 0;
    for (const ch of text) {
      times.push(t);
      if (/[a-z0-9]/i.test(ch)) t += V.ms / 1000; else if (/[.,!?:]/.test(ch)) t += .2; else t += .035;
    }
    return { times, total: t + .18 };
  }
  let talking = [];
  function say(text, who) {
    if (!ctx) return;
    const V = VOICES[who] || VOICES.announcer, plan = talkTimes(text, who), t0 = ctx.currentTime + .02;
    [...text].forEach((ch, i) => {
      if (!/[a-z0-9]/i.test(ch)) return;
      const k = (ch.toLowerCase().charCodeAt(0) * 7) % 5;
      if (talking.length > 200) talking = talking.slice(-100);
      talking.push(osc(voiceBus, V.wave, V.f * (1 + k * .08), t0 + plan.times[i], V.ms / 1000 * .75, .085, { sustain: .6 }));
    });
    musicBus.gain.setTargetAtTime(DUCKED, ctx.currentTime, .05);
    duckUntil = t0 + plan.total;
  }
  // Stop whatever line is being said, for skipping ahead.
  function hush() {
    if (!ctx) return;
    for (const s of talking) { try { s.stop(); } catch (e) {} }
    talking = [];
    duckUntil = ctx.currentTime;
  }

  // Sustained roof noise lives on its own bus. No timers or samples; all nodes stop on exit.
  let roofWant = null, stormLoop = null, beamLoop = null;
  function loopSound(beam) {
    const out = ctx.createGain(); out.gain.value = 0; out.connect(sfxBus);
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = beam ? 650 : 1500; filter.Q.value = beam ? 2 : .6; filter.connect(out);
    const nodes = [], gains = [];
    const noise = ctx.createBufferSource(); noise.buffer = NOISE; noise.loop = true;
    const ng = ctx.createGain(); ng.gain.value = beam ? .13 : .09; noise.connect(ng); ng.connect(filter); noise.start(); nodes.push(noise);
    for (const [wave, f, volume] of beam ? [['sawtooth', 55, .09], ['square', 56.2, .035]] : []) {
      const o = ctx.createOscillator(), gain = ctx.createGain(); o.type = wave; o.frequency.value = f; gain.gain.value = volume;
      o.connect(gain); gain.connect(filter); o.start(); nodes.push(o); gains.push(gain);
    }
    if (!beam) {
      // A steady soft rain above the slower, low-pass wind swells.
      const rain = ctx.createBufferSource(), high = ctx.createBiquadFilter(), level = ctx.createGain();
      rain.buffer = NOISE; rain.loop = true; high.type = 'bandpass'; high.frequency.value = 3200; high.Q.value = .5; level.gain.value = .025;
      rain.connect(high); high.connect(level); level.connect(out); rain.start(); nodes.push(rain); gains.push(high, level);
    }
    const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = beam ? 7 : .27; depth.gain.value = beam ? 420 : 800;
    lfo.connect(depth); depth.connect(filter.frequency); lfo.start(); nodes.push(lfo);
    return { out, filter, nodes, gains, noise, ng, lfo, depth };
  }
  function shaper(amount) { const s = ctx.createWaveShaper(), c = new Float32Array(1024); for (let i = 0; i < 1024; i++) c[i] = Math.tanh(amount * (i / 511.5 - 1)); s.curve = c; return s; }
  // The beam's roar: thunder underneath (detuned saws on low D and A, overdriven, a filter that bursts open, a sub),
  // the mockup's buzzing hum wobbling seven times a second, and the freed souls singing in it: an 'aah' choir
  // (saws through vowel filters) walking Dm, Bb, F, A every 2.4 s, a high voice over it, and stray bell pings.
  function beamRoar() {
    const t = ctx.currentTime, out = ctx.createGain(); out.gain.value = 0; out.connect(sfxBus);
    const nodes = [], gains = [];
    const add = o => { o.start(t); nodes.push(o); return o; };
    const oscN = (type, f, detune = 0) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; return add(o); };
    const g = v => { const x = ctx.createGain(); x.gain.value = v; gains.push(x); return x; };
    const node = n => { gains.push(n); return n; };
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 3; filter.connect(out);
    filter.frequency.setValueAtTime(160, t); filter.frequency.exponentialRampToValueAtTime(1300, t + .6);
    const lfo = add(ctx.createOscillator()), depth = g(300); lfo.frequency.value = 5; lfo.connect(depth); depth.connect(filter.frequency);
    const noise = ctx.createBufferSource(); noise.buffer = NOISE; noise.loop = true; add(noise);
    const ng = g(.06); noise.connect(ng);
    // thunder
    const drive = g(3), sh = node(shaper(3)), post = g(.085); drive.connect(sh); sh.connect(post); post.connect(filter);
    for (const [f, d, v] of [[36.7, 0, .5], [36.7, 11, .5], [55, -7, .35], [73.4, 5, .3]]) { const o = oscN('sawtooth', f, d), gg = g(v); o.connect(gg); gg.connect(drive); }
    const sub = oscN('sine', 36.7), sg = g(.09); sub.connect(sg); sg.connect(out);
    const bp = node(ctx.createBiquadFilter()); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .7; ng.connect(bp); bp.connect(filter);
    // the hum
    const hf = node(ctx.createBiquadFilter()); hf.type = 'lowpass'; hf.frequency.value = 700; hf.Q.value = 3; const hg = g(1.4); hf.connect(hg); hg.connect(out);
    const hl = add(ctx.createOscillator()), hd = g(450); hl.frequency.value = 7; hl.connect(hd); hd.connect(hf.frequency);
    for (const [wave, f, v] of [['sawtooth', 55, .09], ['square', 56.2, .035], ['sawtooth', 110.4, .04]]) { const o = oscN(wave, f), gg = g(v); o.connect(gg); gg.connect(hf); }
    const hn = g(.1); noise.connect(hn); hn.connect(hf);
    // the choir
    const voice = g(0); voice.gain.setValueAtTime(0, t); voice.gain.linearRampToValueAtTime(1, t + .7); voice.connect(out);
    const sum = g(1);
    for (const [f, q, v] of [[730, 5, 1], [1090, 7, .7], [2440, 9, .25]]) { const b = node(ctx.createBiquadFilter()); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = g(v); sum.connect(b); b.connect(bg); bg.connect(voice); }
    const CH = [[50, 57, 62, 65, 69, 74], [46, 53, 58, 62, 65, 70], [53, 57, 60, 65, 69, 72], [45, 52, 57, 61, 64, 69]], HIGH = [81, 82, 84, 85], voices = [];
    for (let i = 0; i < 6; i++) for (const d of [-11, 10]) {
      const o = oscN('sawtooth', hz(CH[0][i]), d), v = add(ctx.createOscillator()), vd = g(hz(CH[0][i]) * .008), og = g(.04);
      v.frequency.value = 4.8 + (i % 3) * .35; v.connect(vd); vd.connect(o.frequency); o.connect(og); og.connect(sum); voices.push([o, i]);
    }
    const hi = oscN('triangle', hz(HIGH[0])), hv = add(ctx.createOscillator()), hd2 = g(hz(81) * .01), hig = g(.05);
    hv.frequency.value = 5.4; hv.connect(hd2); hd2.connect(hi.frequency); hi.connect(hig); hig.connect(voice);
    // The chord walk and the bell pings are scheduled for two minutes; the beam never lasts that long.
    for (let k = 0; k < 50; k++) {
      const at = t + k * 2.4, c = k % 4;
      for (const [o, i] of voices) o.frequency.setTargetAtTime(hz(CH[c][i]), at, .08);
      hi.frequency.setTargetAtTime(hz(HIGH[c]), at, .1);
    }
    const ping = oscN('triangle', hz(86)), pg = g(0); ping.connect(pg); pg.connect(out);
    for (let k = 0; k < 80; k++) { const at = t + .9 + k * 1.45; ping.frequency.setValueAtTime(hz([86, 89, 93, 98][k % 4]), at); pg.gain.setValueAtTime(.05, at); pg.gain.exponentialRampToValueAtTime(.0005, at + 1); }
    return { out, filter, nodes, gains, noise, ng, lfo, depth };
  }
  function stopLoop(loop) {
    if (!loop) return;
    loop.out.gain.cancelScheduledValues(ctx.currentTime); loop.out.gain.setValueAtTime(0, ctx.currentTime);
    loop.nodes.forEach(n => { try { n.stop(); } catch (e) {} n.disconnect(); });
    loop.gains.concat([loop.out, loop.filter, loop.ng, loop.depth]).forEach(n => n.disconnect());
  }
  function roofSound(value) {
    roofWant = value;
    if (!ctx) return;
    if (value && value.storm) { if (!stormLoop) stormLoop = loopSound(false); stormLoop.out.gain.setTargetAtTime(.7 + (value.gust || 0) * .7, ctx.currentTime, .15); }
    else { stopLoop(stormLoop); stormLoop = null; }
    if (value && value.beam) { if (!beamLoop) beamLoop = beamRoar(); beamLoop.out.gain.setTargetAtTime(value.onEye ? 1.4 : .8, ctx.currentTime, .04); }
    else { stopLoop(beamLoop); beamLoop = null; }
  }
  function twang(t, f, vol = .2) {
    osc(sfxBus, 'p12', f, t, .45, vol, { to: f * .72, sustain: .08 });
    osc(sfxBus, 'triangle', f * .5, t, .65, vol * .5, { sustain: .12 });
  }
  // ---------- sound effects ----------
  let shotN = 0;
  const SFX = {
    armorClank: t => { noiseHit(sfxBus, t, .08, .16, 'highpass', 2800); twang(t, 780, .08); },
    cableSnap: t => { noiseHit(sfxBus, t, .22, .32, 'highpass', 1800); twang(t, 135, .18); },
    ding: t => { osc(sfxBus, 'sine', hz(84), t, .8, .16, { attack: .005, sustain: .1 }); osc(sfxBus, 'triangle', hz(96), t, .5, .05); },
    storm: t => { noiseHit(sfxBus, t, .4, .04, 'lowpass', 1600); roofSound({ storm: true, beam: false }); },
    thunder: (t, power = 1) => { noiseHit(sfxBus, t + .12, 1.6, .34 * power, 'lowpass', 380, .8, 60); osc(sfxBus, 'sine', 58, t + .15, 1.2, .17 * power, { to: 27, sustain: .12 }); },
    snare: t => noiseHit(sfxBus, t, .15, .18, 'bandpass', 6000, 3, 900),
    snareCut: t => twang(t, 730, .14),
    gust: t => noiseHit(sfxBus, t, 1.1, .16, 'bandpass', 1200, .6, 240),
    spoolSnap: t => { twang(t, 180, .26); noiseHit(sfxBus, t, .12, .4, 'highpass', 2400); },
    // the fusion: a sub boom, a crash and a falling power chord, then the souls' choir in one blast with bells over it
    beam: t => {
      osc(sfxBus, 'sine', 90, t, 1.4, .385, { to: 28, sustain: .4 });
      noiseHit(sfxBus, t, 1.6, .35, 'lowpass', 5000, 1, 200); noiseHit(sfxBus, t, .08, .35, 'highpass', 3000);
      osc(sfxBus, 'sawtooth', 73.4, t, 1, .084, { to: 40, sustain: .5 }); osc(sfxBus, 'sawtooth', 110, t, 1, .063, { to: 55, sustain: .5 });
      [62, 65, 69, 74, 77, 81, 86].forEach((m, i) => { osc(sfxBus, 'sawtooth', hz(m), t, .9, .03, { attack: .01, sustain: .5 }); osc(sfxBus, 'triangle', hz(m + 12), t + i * .03, 2.4, .05, { attack: .01, sustain: .3 }); });
    },
    // the flood: one note per returning soul, climbing the D minor scale from D5 (n is how far the flood has got, 0-11)
    rush: (t, n) => { const m = [74, 76, 77, 79, 81, 82, 84, 86, 88, 89, 91, 93][Math.max(0, Math.min(11, n || 0))]; osc(sfxBus, 'triangle', hz(m), t, .14, .1, { sustain: .15 }); },
    // the pinch: the five streams squeezing into one, a rising sweep (seconds: how long the pinch lasts)
    pinch: (t, seconds) => { const d = seconds || .45; osc(sfxBus, 'square', 300, t, d, .06, { to: 1500, sustain: .3 }); osc(sfxBus, 'sawtooth', 150, t, d, .04, { to: 760, sustain: .3 }); },
    snap: t => { noiseHit(sfxBus, t, .35, .65, 'highpass', 1500, 1, 300); for (let i = 0; i < 9; i++) twang(t + i * .015, 95 + i * 67, .13); },
    chord: t => { [62, 66, 69, 74, 78].forEach((m, i) => osc(sfxBus, i < 3 ? 'triangle' : 'p50', hz(m), t + i * .018, 3.2, i < 3 ? .12 : .055, { attack: .018, sustain: .2 })); },
    // the blaster: a bright laser zap sweeping down, a sparkle on top, a punchy low kick under it and a crack of noise.
    // It steps through three pitches so steady fire sings instead of droning; Spread Shot adds a fat detuned buzz.
    shot: (t, spread) => {
      const f = [1320, 1180, 1480][shotN++ % 3] * (1 + Math.random() * .04);
      osc(sfxBus, 'p25', f, t, .1, .14, { to: f * .32, sustain: .5 });
      osc(sfxBus, 'p12', f * 2, t, .04, .05, { to: f * .9 });
      osc(sfxBus, 'square', 210, t, .07, .13, { to: 70, sustain: .4 });
      noiseHit(sfxBus, t, .05, .2, 'highpass', 3500);
      if (spread) { osc(sfxBus, 'sawtooth', f * .5, t, .1, .08, { to: f * .2 }); osc(sfxBus, 'sawtooth', f * .505, t, .1, .06, { to: f * .2 }); }
    },
    // the 13th Floor's soul stream beside the bolt: a quiet glassy shimmer, D6 sliding up to A6, under the zap
    hintStream: t => { osc(sfxBus, 'sine', hz(86), t, .18, .045, { to: hz(93), sustain: .5 }); osc(sfxBus, 'triangle', hz(98), t + .03, .14, .018, { vib: true, sustain: .4 }); },
    // out of charge: a dry double click; the last shot powers down and vents (it's overheated); full again chirps
    empty: t => { for (const d of [0, .06]) { osc(sfxBus, 'square', 110, t + d, .03, .14); noiseHit(sfxBus, t + d, .025, .3, 'bandpass', 2600, 5); } },
    drained: t => { osc(sfxBus, 'p25', 900, t, .4, .1, { to: 90, sustain: .8 }); osc(sfxBus, 'square', 220, t + .05, .3, .06, { to: 55 }); noiseHit(sfxBus, t + .12, .6, .07, 'highpass', 5200); },
    // the trigger pulled while it's overheated: a choked zap that dies at once, a low buzz and a few electric crackles
    sputter: t => { const f = 560 + Math.random() * 90; osc(sfxBus, 'p12', f, t, .045, .07, { to: f * .35 }); osc(sfxBus, 'sawtooth', 96, t, .08, .045, { to: 68 }); for (let i = 0; i < 3; i++) noiseHit(sfxBus, t + .015 + i * .03 + Math.random() * .012, .014, .14, 'bandpass', 3800 - i * 650, 6); },
    ready: t => { [76, 83].forEach((m, i) => osc(sfxBus, 'p25', hz(m + 12), t + i * .07, .08, .07)); },
    coffee: t => { [60, 64, 67].forEach((m, i) => osc(sfxBus, 'triangle', hz(m + 12), t + i * .06, .08, .12)); osc(sfxBus, 'p50', hz(84), t + .2, .25, .07, { vib: true }); },
    // the Shredder's tell before it spits: a quick rising growl
    rev: t => { osc(sfxBus, 'sawtooth', 70, t, .32, .07, { to: 200 }); noiseHit(sfxBus, t + .1, .2, .12, 'bandpass', 700, 2); },
    // a whole formation wiped out: a rising run, a bright chord and a crash
    wipe: t => { [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => osc(sfxBus, 'p25', hz(m), t + i * .045, .09, .1)); [84, 88, 91].forEach(m => osc(sfxBus, 'p50', hz(m), t + .33, .45, .07, { vib: true })); noiseHit(sfxBus, t + .33, .6, .35, 'highpass', 5000); },
    // the Shredder's power surge: an electric crackle; it knocks the blaster away: a zap and a clatter
    surge: t => { for (let i = 0; i < 8; i++) noiseHit(sfxBus, t + i * .05, .04, .25, 'bandpass', 2500 + (i % 3) * 900, 6); osc(sfxBus, 'sawtooth', 110, t, .4, .06, { to: 160 }); },
    disarm: t => { osc(sfxBus, 'square', 1400, t, .2, .12, { to: 200 }); noiseHit(sfxBus, t, .25, .4, 'bandpass', 3000, 3); for (let i = 0; i < 3; i++) noiseHit(sfxBus, t + .25 + i * .09, .05, .3, 'bandpass', 1800 - i * 300, 4); },
    // the rug rolling back toward you: a reversed whoosh and a clatter
    rewind: t => { noiseHit(sfxBus, t, .45, .35, 'bandpass', 3000, 1.2, 600); osc(sfxBus, 'sawtooth', 240, t, .45, .07, { to: 70 }); },
    // rugged: the rug yanked out from under him
    yank: t => { noiseHit(sfxBus, t, .3, .5, 'bandpass', 800, 1.2, 3000); osc(sfxBus, 'triangle', 300, t, .35, .2, { to: 900 }); },
    // one heart left: a low double thump
    thump: t => { osc(sfxBus, 'sine', 75, t, .12, .32, { to: 42 }); osc(sfxBus, 'sine', 70, t + .16, .1, .22, { to: 40 }); },
    // office life: a desk phone trilling twice somewhere down the hall, a copier whirring and clunking
    phone: t => { for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) osc(sfxBus, 'p25', i % 2 ? 1300 : 1100, t + r * .5 + i * .04, .04, .022); },
    printer: t => { for (let i = 0; i < 3; i++) noiseHit(sfxBus, t + i * .18, .14, .1, 'bandpass', 1400 + i * 300, 3); osc(sfxBus, 'sawtooth', 55, t, .6, .03, { to: 62, sustain: .8 }); noiseHit(sfxBus, t + .62, .05, .14, 'lowpass', 900); },
    // a pickup turns up: a bright little twinkle
    appear: t => { [88, 95, 100, 95, 100].forEach((m, i) => osc(sfxBus, 'p25', hz(m), t + i * .05, .05, .045)); osc(sfxBus, 'triangle', hz(100), t + .25, .2, .07, { vib: true }); },
    power: t => { for (let i = 0; i < 8; i++) osc(sfxBus, 'p25', hz(64 + i * 3), t + i * .035, .06, .07); osc(sfxBus, 'p50', hz(88), t + .3, .3, .07, { vib: true }); },
    audit: t => { for (let i = 0; i < 4; i++) osc(sfxBus, 'p50', i % 2 ? 660 : 880, t + i * .16, .14, .09, { sustain: .9 }); for (let i = 0; i < 10; i++) noiseHit(sfxBus, t + .64 + i * .04, .05, .25, 'bandpass', 1600, .8); },
    jump: t => osc(sfxBus, 'p25', 320, t, .12, .08, { to: 760 }),
    // a big whoosh, a steel ring and a low swing
    slash: t => { noiseHit(sfxBus, t, .18, .75, 'bandpass', 5200, 1.1, 900); noiseHit(sfxBus, t, .08, .35, 'highpass', 6500); osc(sfxBus, 'triangle', 420, t, .12, .22, { to: 140 }); osc(sfxBus, 'p12', 2600, t + .02, .22, .06, { to: 2300, sustain: .5 }); osc(sfxBus, 'p12', 3900, t + .02, .16, .035, { sustain: .4 }); },
    // a bright ping; in a rally each return rings a step higher
    deflect: (t, n) => { const up = Math.pow(2, Math.min(12, (n || 0) * 2) / 12); osc(sfxBus, 'p50', 1480 * up, t, .05, .1); osc(sfxBus, 'p50', 2220 * up, t + .045, .09, .09, { sustain: .4 }); noiseHit(sfxBus, t, .04, .25, 'highpass', 4000); },
    // the Shredder bats the bundle back: a hollow thwock that climbs with the rally
    volley: (t, n) => { const f = 180 * Math.pow(2, Math.min(12, (n || 0) * 2) / 12); osc(sfxBus, 'square', f, t, .09, .14, { to: f * .6 }); noiseHit(sfxBus, t, .07, .35, 'bandpass', 900, 1.5); },
    smash: t => { noiseHit(sfxBus, t, .6, .7, 'lowpass', 3000, 1, 120); osc(sfxBus, 'sine', 160, t, .5, .5, { to: 40, sustain: .5 }); [72, 79, 84].forEach((m, i) => osc(sfxBus, 'p25', hz(m + 12), t + .1 + i * .06, .1, .08)); },
    hit: t => { noiseHit(sfxBus, t, .09, .45, 'lowpass', 2200); osc(sfxBus, 'square', 260, t, .08, .12, { to: 110 }); },
    poof: t => noiseHit(sfxBus, t, .07, .18, 'highpass', 3000),
    // one soft bell as a soul joins the blaster: D5, then F5 (the roof will add A5)
    bell: (t, n) => { const m = [74, 77, 81][n || 0]; osc(sfxBus, 'triangle', hz(m), t, 1.8, .2, { attack: .015, sustain: .25 }); osc(sfxBus, 'sine', hz(m + 12), t, 1.2, .09, { sustain: .2 }); osc(sfxBus, 'sine', hz(m + 19), t + .02, .7, .03, { sustain: .1 }); },
    soul: (t, n) => { const up = Math.min(12, n || 0); [76, 80, 83, 88].forEach((m, i) => osc(sfxBus, 'triangle', hz(m + 12 + up), t + i * .045, .09, .12, { sustain: .5 })); },
    hurt: t => { osc(sfxBus, 'square', 170, t, .26, .12, { to: 55 }); noiseHit(sfxBus, t, .18, .3, 'lowpass', 900); },
    warn: t => { for (let i = 0; i < 6; i++) noiseHit(sfxBus, t + i * .11, .03, .3, 'bandpass', 2600, 5); osc(sfxBus, 'p50', 220, t, .5, .05, { to: 330 }); },
    pull: t => { osc(sfxBus, 'sawtooth', 62, t, .5, .1, { to: 70, sustain: .9 }); noiseHit(sfxBus, t, .5, .14, 'bandpass', 500, 2); },
    cut: t => { noiseHit(sfxBus, t, .3, .45, 'highpass', 6000, 1, 1400); osc(sfxBus, 'p12', 900, t + .04, .12, .05, { to: 300 }); },
    jam: t => { for (let i = 0; i < 3; i++) { osc(sfxBus, 'square', 95 - i * 12, t + i * .09, .07, .14); noiseHit(sfxBus, t + i * .09, .06, .3, 'bandpass', 1200, 2); } },
    bosshit: t => osc(sfxBus, 'triangle', 140, t, .07, .2, { to: 70 }),
    spit: t => { noiseHit(sfxBus, t, .12, .25, 'lowpass', 2400, 1, 600); osc(sfxBus, 'p12', 500, t, .1, .05, { to: 200 }); },
    chomp: t => { for (let i = 0; i < 8; i++) { noiseHit(sfxBus, t + i * .07, .06, .35, 'bandpass', 800 + (i % 2) * 600, 1.5); osc(sfxBus, 'square', 70, t + i * .07, .05, .1); } },
    dark: t => { osc(sfxBus, 'sawtooth', 320, t, .6, .12, { to: 40, sustain: .8 }); noiseHit(sfxBus, t, .3, .3, 'lowpass', 1200, 1, 100); },
    lights: t => { for (let i = 0; i < 3; i++) noiseHit(sfxBus, t + i * .07, .03, .3, 'bandpass', 3000, 4); osc(sfxBus, 'p25', 200, t + .2, .3, .06, { to: 900 }); },
    wake: t => { for (let i = 0; i < 4; i++) osc(sfxBus, 'p50', i % 2 ? 660 : 880, t + i * .18, .16, .08, { sustain: .9 }); },
    explode: t => { noiseHit(sfxBus, t, 1.4, .7, 'lowpass', 2600, 1, 70); osc(sfxBus, 'sine', 120, t, .9, .4, { to: 30, sustain: .5 }); for (let i = 1; i < 5; i++) noiseHit(sfxBus, t + i * .22, .3, .35, 'lowpass', 1800, 1, 200); },
    clear: t => { [60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((m, i) => osc(sfxBus, 'p50', hz(m + 12), t + i * .085, i === 8 ? .6 : .12, .09, { vib: i === 8 })); [48, 55, 60].forEach((m, i) => osc(sfxBus, 'triangle', hz(m), t + i * .25, .3, .25)); },
    over: t => { [71, 67, 64, 59, 52].forEach((m, i) => osc(sfxBus, 'p25', hz(m), t + i * .16, i === 4 ? .7 : .15, .1, { vib: i === 4 })); },
    start: t => { [64, 67, 71, 76].forEach((m, i) => osc(sfxBus, 'p50', hz(m + 12), t + i * .06, .1, .08)); },
    tick: t => osc(sfxBus, 'triangle', hz(88), t, .05, .12),
    // the long ride (from its prototype): the carpshits' dive and paper; the cable taken, the drop, the brakes, the
    // threads bursting in and reeling the car up, the slam at the top, the ding, the doors, the crate
    swoop: t => { noiseHit(sfxBus, t, .45, .07, 'bandpass', 900, 1.5); osc(sfxBus, 'p25', 700, t, .4, .03, { to: 260 }); },
    wadThrow: t => noiseHit(sfxBus, t, .08, .045, 'bandpass', 2400, 2),
    rideCreak: t => { osc(sfxBus, 'sawtooth', 70, t, 1, .036, { to: 55 }); noiseHit(sfxBus, t, .9, .036, 'bandpass', 400, 6); },
    rideWind: t => { for (let i = 0; i < 6; i++) osc(sfxBus, 'p25', 220 + i * 40, t + i * .1, .09, .036, { to: 330 + i * 40 }); },
    rideSlack: t => { osc(sfxBus, 'sawtooth', 420, t, .6, .086, { to: 60 }); noiseHit(sfxBus, t, .5, .14, 'bandpass', 700, 3); },
    rideFall: t => { osc(sfxBus, 'p50', 900, t, 1.8, .043, { to: 120, sustain: 1 }); for (let i = 0; i < 18; i++) noiseHit(sfxBus, t + i * .1, .08, .086, 'bandpass', 600 + (i % 3) * 300, 2);
      for (let i = 0; i < 4; i++) osc(sfxBus, 'square', 1100, t + i * .4, .2, .036); },
    rideBrake: t => { noiseHit(sfxBus, t, .8, .29, 'bandpass', 3400, 4); osc(sfxBus, 'sawtooth', 1800, t, .7, .036, { to: 1300 }); osc(sfxBus, 'sine', 90, t + .55, .4, .57, { to: 30 }); noiseHit(sfxBus, t + .55, .4, .36, 'lowpass', 500); },
    rideBurst: t => { noiseHit(sfxBus, t, .3, .29, 'lowpass', 1200); noiseHit(sfxBus, t + .1, .5, .29, 'bandpass', 3200, 3, 260); },
    rideHook: t => { for (let i = 0; i < 3; i++) { osc(sfxBus, 'p25', 300 + i * 80, t + i * .09, .1, .07, { to: 90 }); noiseHit(sfxBus, t + i * .09, .06, .14, 'highpass', 3000); } },
    rideReel: t => { osc(sfxBus, 'sawtooth', 60, t, .9, .086, { to: 420 }); for (let i = 0; i < 8; i++) noiseHit(sfxBus, t + i * .1, .06, .07, 'bandpass', 900 + i * 150, 3); },
    rideSlam: t => { osc(sfxBus, 'sine', 110, t, .5, .64, { to: 30 }); noiseHit(sfxBus, t, .5, .36, 'lowpass', 600); },
    rideDing: t => { osc(sfxBus, 'sine', 1318, t, 1.4, .13, { sustain: .2 }); osc(sfxBus, 'triangle', 1046, t + .25, 1.6, .1, { sustain: .2 }); },
    rideDoors: t => { noiseHit(sfxBus, t, 1.2, .057, 'lowpass', 300); noiseHit(sfxBus, t + .4, 3, .043, 'bandpass', 5000, .3); },
    rideCrate: t => noiseHit(sfxBus, t, .8, .057, 'lowpass', 500),
    // Floor 48, the factory: the alarm (two tones, faster as the panic rises), a press, a machine taking a hit and
    // breaking, a soul tank bursting (glass, a whoosh, the souls' chime), a line going down (a crash and a power chord),
    // the animator zapping a rug alive, a bobbin thrown, a rug roll launched, the collapse's rumble, and p(Loom)
    // spoiling the streams (a sour, falling chord with a tear of noise)
    klaxon: (t, level) => { const n = level > 1 ? 6 : 4, d = level > 1 ? .13 : .2; for (let i = 0; i < n; i++) osc(sfxBus, 'p50', i % 2 ? 587 : 622, t + i * d, d * .92, .05, { sustain: .9 }); },
    press: t => { osc(sfxBus, 'sine', 95, t, .22, .3, { to: 45 }); noiseHit(sfxBus, t, .12, .18, 'lowpass', 900); noiseHit(sfxBus, t + .02, .05, .1, 'highpass', 4000); },
    machineHit: t => { noiseHit(sfxBus, t, .06, .22, 'bandpass', 2400, 3); osc(sfxBus, 'square', 1760, t, .05, .035, { to: 1200 }); osc(sfxBus, 'square', 1244, t, .05, .03, { to: 900 }); },
    machineBreak: t => { noiseHit(sfxBus, t, .9, .55, 'lowpass', 2200, 1, 90); osc(sfxBus, 'sine', 110, t, .6, .36, { to: 32, sustain: .4 }); for (let i = 0; i < 4; i++) { noiseHit(sfxBus, t + .08 + i * .07, .05, .2, 'bandpass', 3000 - i * 400, 4); osc(sfxBus, 'square', 900 - i * 120, t + .08 + i * .07, .05, .03, { to: 400 }); } },
    tankBurst: t => { for (let i = 0; i < 7; i++) noiseHit(sfxBus, t + i * .025, .12, .22, 'highpass', 5000 + i * 300, 2); noiseHit(sfxBus, t, .7, .3, 'bandpass', 1400, .8, 300); [86, 89, 93, 98].forEach((m, i) => osc(sfxBus, 'triangle', hz(m), t + .1 + i * .05, .3, .07, { sustain: .3 })); },
    lineDown: t => { noiseHit(sfxBus, t, 2, .7, 'lowpass', 2600, 1, 60); osc(sfxBus, 'sine', 80, t, 1.6, .5, { to: 26, sustain: .4 }); for (let i = 1; i < 7; i++) noiseHit(sfxBus, t + i * .18, .35, .32, 'lowpass', 1700, 1, 200); spoolHit(); },
    animate: t => { for (let i = 0; i < 5; i++) noiseHit(sfxBus, t + i * .03, .03, .14, 'bandpass', 3200 + (i % 2) * 1400, 6); osc(sfxBus, 'sawtooth', 160, t, .18, .05, { to: 640 }); },
    bobbin: t => { osc(sfxBus, 'p25', 520, t, .3, .04, { to: 900 }); noiseHit(sfxBus, t, .25, .05, 'bandpass', 1800, 2); },
    roll: t => { osc(sfxBus, 'sawtooth', 55, t, .5, .08, { to: 90, sustain: .8 }); noiseHit(sfxBus, t, .5, .12, 'lowpass', 700); },
    rumble: (t, seconds) => { const d = seconds || 3; noiseHit(sfxBus, t, d, .4, 'lowpass', 260, .7, 60); osc(sfxBus, 'sine', 42, t, d, .3, { to: 30, sustain: .8 }); for (let i = 0; i < d * 3; i++) noiseHit(sfxBus, t + i / 3 + Math.random() * .2, .3, .2, 'lowpass', 1500, 1, 200); },
    sour: t => { [62, 63, 68, 69].forEach((m, i) => osc(sfxBus, 'sawtooth', hz(m + 12), t, 1.2, .045, { to: hz(m + 12) * .5, sustain: .5 })); noiseHit(sfxBus, t, .5, .35, 'bandpass', 1800, .7, 200); osc(sfxBus, 'p12', hz(98), t, .6, .05, { to: hz(62) }); }
  };

  const api = {
    init, roofSound,
    // Hold the music down for a moment (the souls' hint), as a line of talk does.
    duck(seconds) { if (!ctx) return; musicBus.gain.setTargetAtTime(DUCKED, ctx.currentTime, .25); duckUntil = Math.max(duckUntil, ctx.currentTime + seconds); },
    onready: null,
    get ready() { return !!ctx && ctx.state === 'running'; },
    get muted() { return muted; },
    play(name, arg) { if (!ctx || ctx.state !== 'running' || !SFX[name]) return; SFX[name](ctx.currentTime + .005, arg); },
    // Switch the music: 'theme', the 13th Floor's 'floorHall', 'floorCopy' and 'floorShred', the ride's and the roof's, or null.
    // Remembered until sound can start. ('tower', 'staff', 'dark', 'copy' and 'shred' are the floor's old tracks, kept for the lab.)
    music(id, options = {}) {
      id = id || null;
      if (id && !/^roof/.test(id)) { roofSound(null); stopMusicFx(); }
      if (options.hard) stopMusicFx();
      if (ctx && P.id && id && id !== P.id && ['bar', 'beat'].includes(options.boundary)) { want = id; P.pendingTrack = { id, boundary: options.boundary, options }; return; }
      if (id === want && (P.id === id || !ctx) && !options.slam && !options.hard) return;
      want = id; wantOptions = options;
      if (!ctx) return;
      if (id) playTrack(id, options); else stopTrack(!!options.hard);
    },
    get track() { return want; },
    // Tempo: 1 is the track's own; above 1 plays it faster at the same pitch.
    tempo(r) { const value = Math.max(.5, Math.min(2, r || 1)); if (P.modern) P.pendingTempo = value; else P.rate = value; },
    stems(names) { if (!ctx) wantOptions = Object.assign({}, wantOptions, { stems: names }); P.pendingStems = new Set(names); },
    stinger, riser, roofCue, factoryCue,
    // the long ride's brownout: the music muffles and sags over a couple of seconds, until it's stopped
    brownout(seconds = 2.3) {
      if (!ctx || !P.out || P.out.brownout) return;
      const n = ctx.currentTime, lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(9000, n); lp.frequency.exponentialRampToValueAtTime(380, n + seconds);
      P.out.disconnect(); P.out.connect(lp); lp.connect(musicBus); P.out.brownout = lp;
      P.out.gain.setValueAtTime(1, n); P.out.gain.linearRampToValueAtTime(.55, n + seconds);
    },
    registerTrack(id, data) {
      const heldPattern = P.id === id && P.patternLoop != null ? TRACKS[id].order[P.si] : null;
      delete data.comp; TRACKS[id] = data;
      if (id === 'roofA') TRACKS.roof = data; if (id === 'roofAHeavy') TRACKS.roofHeavy = data;
      if (ctx && P.id === id) P.pendingTrack = { id, boundary: 'bar', options: Object.assign({ stems: [...P.stems] }, heldPattern && data.order.includes(heldPattern) ? { pattern: heldPattern, loopPattern: true } : {}) };
    },
    get musicState() { return { pattern: P.modern && P.id ? TRACKS[P.id].order[P.si] : null, patternLoop: P.patternLoop, playing: P.id, pending: P.pendingTrack && P.pendingTrack.id, stems: [...P.stems], nextStems: P.pendingStems && [...P.pendingStems], rate: P.rate }; },
    tracks() { return Object.entries(TRACKS).filter(([id]) => !['roof', 'roofHeavy'].includes(id)).map(([id, tr]) => ({ id, name: tr.name || id, key: tr.key, bpm: tr.bpm || tr.sections[0].bpm, stems: tr.patterns ? [...new Set(Object.values(tr.patterns).flatMap(p => Object.values(p.channels).map(c => c.stem)))] : [], seconds: tr.patterns ? compilePatterns(tr).reduce((n,p) => n + p.steps*p.stepDur, 0) : tr.sections.map(compile).reduce((n,p)=>n+p.steps*p.stepDur,0) })); },
    say, talkTimes, hush,
    toggle() {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, .02);
      return muted;
    },
    pause() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume() { if (ctx && ctx.state === 'suspended') wake(); }
  };
  return api;
})();
