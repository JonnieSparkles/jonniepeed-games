// Unruggabull II sound: everything is synthesized with Web Audio, no audio files.
// Music runs on a small chip sequencer: two pulse leads, a pulse arpeggio, a triangle bass and noise drums,
// with an overdriven saw for the heavier parts (the title theme adds extra channels, VRC6 style).
// Characters talk in blips, one tone per letter, timed to match the caption as it types out.
// Browsers only allow audio after a tap or key press: `ready` is false until then, and `onready` is
// called whenever that changes so the Sound button can show what's really happening.
window.UnrugSound = (function () {
  'use strict';
  const KEY = 'unruggabull-ii-muted';
  const MUSIC_LEVEL = .5, DUCKED = .16;
  let ctx = null, master, musicBus, sfxBus, voiceBus, NOISE = null, want = null, duckUntil = 0;
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
    if (want) playTrack(want);
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
  const P = { id: null, comp: null, si: 0, step: 0, next: 0, timer: 0, out: null, drive: null, loopFrom: 0 };
  function stopTrack() {
    if (!P.id) return;
    clearInterval(P.timer); P.timer = 0;
    if (P.out && ctx) { const o = P.out; o.gain.setTargetAtTime(0, ctx.currentTime, .03); setTimeout(() => { try { o.disconnect(); } catch (e) {} }, 400); }
    P.id = null; P.out = null;
  }
  function playTrack(id) {
    stopTrack();
    if (!ctx || !TRACKS[id]) return;
    const tr = TRACKS[id];
    tr.comp = tr.comp || tr.sections.map(compile);
    P.id = id; P.comp = tr.comp; P.loopFrom = tr.loopFrom || 0; P.si = 0; P.step = 0; P.next = ctx.currentTime + .08;
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
    if (P.next < ctx.currentTime - .1) P.next = ctx.currentTime + .05;
    while (P.next < ctx.currentTime + .12) {
      const S = P.comp[P.si], t = P.next;
      for (const ch of S.chans) { const evs = ch.byStep[P.step]; if (evs) for (const e of evs) osc(ch.drive ? P.drive : P.out, ch.wave, hz(e.m), t, e.len * S.stepDur * (e.g || ch.gate || .9), ch.vol, { vib: ch.vib }); }
      const d = S.drums[P.step]; if (DRUM[d]) DRUM[d](t, P.out);
      if (S.crash.has(P.step)) DRUM.c(t, P.out);
      P.next += S.stepDur; P.step++;
      if (P.step >= S.steps) { P.step = 0; P.si = P.si + 1 < P.comp.length ? P.si + 1 : P.loopFrom; }
    }
    if (duckUntil && ctx.currentTime > duckUntil) { duckUntil = 0; musicBus.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime, .08); }
  }

  // ---------- blip talk ----------
  const VOICES = {
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

  // ---------- sound effects ----------
  const SFX = {
    shot: t => osc(sfxBus, 'p25', 1250, t, .05, .035, { to: 700 }),
    jump: t => osc(sfxBus, 'p25', 320, t, .12, .08, { to: 760 }),
    slash: t => { noiseHit(sfxBus, t, .13, .32, 'bandpass', 4200, 1.2, 1100); osc(sfxBus, 'p12', 1600, t, .06, .04, { to: 900 }); },
    deflect: t => { osc(sfxBus, 'p50', 1480, t, .05, .09); osc(sfxBus, 'p50', 2220, t + .045, .09, .08, { sustain: .4 }); },
    hit: t => { noiseHit(sfxBus, t, .08, .3, 'lowpass', 1800); osc(sfxBus, 'square', 230, t, .08, .07, { to: 110 }); },
    poof: t => noiseHit(sfxBus, t, .07, .18, 'highpass', 3000),
    soul: t => { [76, 80, 83, 88].forEach((m, i) => osc(sfxBus, 'triangle', hz(m + 12), t + i * .045, .09, .12, { sustain: .5 })); },
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
    tick: t => osc(sfxBus, 'triangle', hz(88), t, .05, .12)
  };

  const api = {
    init,
    onready: null,
    get ready() { return !!ctx && ctx.state === 'running'; },
    get muted() { return muted; },
    play(name) { if (!ctx || ctx.state !== 'running' || !SFX[name]) return; SFX[name](ctx.currentTime + .005); },
    // Switch the music: 'theme', 'tower', 'shred' or null for silence. Remembered until sound can start.
    music(id) {
      id = id || null;
      if (id === want && (P.id === id || !ctx)) return;
      want = id;
      if (!ctx) return;
      if (id) playTrack(id); else stopTrack();
    },
    get track() { return want; },
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
