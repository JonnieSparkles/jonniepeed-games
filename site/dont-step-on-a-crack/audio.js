// Don't Step on a Crack: every sound is synthesized with Web Audio, no files.
// The context starts on the first tap (browsers block audio before that).
// `quiet` mutes game sounds but keeps the wind and birds, for the title screen's demo walk.
'use strict';
const CrackSound = {
  c: null, nb: null, master: null, amb: null, on: true, quiet: false,
  init() {
    if (this.c) { if (this.c.state === 'suspended') this.c.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const c = this.c = new AC();
      const n = c.sampleRate, b = c.createBuffer(1, n, n), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.nb = b;
      this.master = c.createGain(); this.master.gain.value = this.on ? 1 : 0; this.master.connect(c.destination);
      this.ambient();
    } catch (e) { this.c = null; }
  },
  setOn(v) { this.on = v; if (this.c && this.master) this.master.gain.setTargetAtTime(v ? 1 : 0, this.c.currentTime, 0.03); },
  live() { return this.c && this.on && !this.quiet; },
  out(pan) {
    if (pan && this.c.createStereoPanner) { const p = this.c.createStereoPanner(); p.pan.value = pan; p.connect(this.master); return p; }
    return this.master;
  },
  env(g, t, peak, dur, att) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + (att || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); },
  noise(dur, type, freq, q, peak, when = 0, o = {}) {
    if (!this.live() && !o.always) return;
    if (!this.c || !this.on) return;
    const c = this.c, t = c.currentTime + when, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.nb; f.type = type; f.frequency.setValueAtTime(freq, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    f.Q.value = q; this.env(g, t, peak, dur, o.att);
    s.connect(f); f.connect(g); g.connect(this.out(o.pan)); s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.05);
  },
  tone(f0, f1, dur, peak, type = 'sine', when = 0, o = {}) {
    if (!this.live() && !o.always) return;
    if (!this.c || !this.on) return;
    const c = this.c, t = c.currentTime + when, os = c.createOscillator(), g = c.createGain();
    os.type = type; os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this.env(g, t, peak, dur, o.att); os.connect(g); g.connect(this.out(o.pan)); os.start(t); os.stop(t + dur + 0.05);
  },

  // ---- wind bed and birds (play on the title screen too)
  ambient() {
    const c = this.c, len = c.sampleRate * 3, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const drift = d[len - 1] - d[0];
    for (let i = 0; i < len; i++) d[i] -= drift * i / (len - 1);          // seamless loop
    const s = c.createBufferSource(); s.buffer = b; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650;
    const g = c.createGain(); g.gain.value = 0.045;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
    const lg = c.createGain(); lg.gain.value = 0.03; lfo.connect(lg); lg.connect(g.gain);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(); lfo.start(); this.amb = { g, f };
  },
  wind(stage) {
    if (!this.amb) return;
    const t = this.c.currentTime;
    this.amb.g.gain.setTargetAtTime(0.045 + stage * 0.014, t, 1.5);
    this.amb.f.frequency.setTargetAtTime(650 + stage * 120, t, 1.5);
  },
  bird() {
    const pan = Math.random() * 1.6 - 0.8, base = 2600 + Math.random() * 1600, n = 2 + (Math.random() * 3 | 0);
    let w = 0;
    for (let i = 0; i < n; i++) {
      const f0 = base * (0.9 + Math.random() * 0.2);
      this.tone(f0, f0 * (1.15 + Math.random() * 0.35), 0.06 + Math.random() * 0.04, 0.035, 'sine', w, { pan, always: true });
      w += 0.09 + Math.random() * 0.08;
    }
  },

  // ---- feet
  step() { const p = 0.85 + Math.random() * 0.3; this.noise(0.08, 'lowpass', 460 * p, 0.8, 0.5); this.noise(0.06, 'lowpass', 380 * p, 0.8, 0.28, 0.055); this.noise(0.03, 'bandpass', 2400, 1.5, 0.05, 0.01); },
  tip() { const p = 0.9 + Math.random() * 0.2; this.noise(0.035, 'bandpass', 1700 * p, 1.2, 0.14); this.tone(1150 * p, 1000 * p, 0.03, 0.025, 'triangle'); },   // a step on your toes
  leaves() { this.step(); for (let i = 0; i < 9; i++) this.noise(0.012 + Math.random() * 0.02, 'highpass', 2500 + Math.random() * 3500, 0.7, 0.12 + Math.random() * 0.2, Math.random() * 0.16); },
  gum() { this.step(); this.tone(260, 90, 0.16, 0.2, 'triangle', 0.03); this.noise(0.14, 'lowpass', 700, 2, 0.15, 0.04); },
  lift() { this.noise(0.16, 'bandpass', 900, 0.8, 0.07, 0, { f1: 2200, att: 0.06 }); },
  strain() { this.tone(900, 1400, 0.07, 0.05, 'triangle'); },
  scuff() { this.noise(0.3, 'bandpass', 800, 0.7, 0.35); this.tone(90, 50, 0.15, 0.3, 'sine', 0.22); this.noise(0.08, 'lowpass', 400, 0.8, 0.4, 0.22); },
  giantLand() { this.tone(80, 32, 0.4, 0.6); this.noise(0.16, 'lowpass', 300, 0.8, 0.65); this.noise(0.3, 'bandpass', 900, 0.7, 0.12, 0.03); },
  // the strained warble while a leg wobbles; returns a function that stops it
  wobble(dur) {
    if (!this.live()) return null;
    const c = this.c, t = c.currentTime, o = c.createOscillator(), v = c.createOscillator(), vg = c.createGain(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.linearRampToValueAtTime(330, t + dur);
    v.frequency.setValueAtTime(7, t); v.frequency.linearRampToValueAtTime(14, t + dur); vg.gain.value = 28; v.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.08); g.gain.linearRampToValueAtTime(0.075, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); v.start(t);
    let done = false;
    return () => {
      if (done) return; done = true;
      const n = c.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(0.05, n); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.06);
      o.stop(n + 0.08); v.stop(n + 0.08);
    };
  },
  snap() { this.noise(0.06, 'highpass', 1800, 0.7, 0.35, 0, { f1: 6000 }); this.tone(600, 120, 0.12, 0.12, 'triangle', 0.03); this.noise(0.1, 'lowpass', 450, 0.8, 0.4, 0.12); },

  // ---- trouble
  crack(kind) {
    const k = kind === 'line' ? 1.25 : 1;
    this.noise(0.035, 'bandpass', 2300 * k, 5, 0.9); this.noise(0.04, 'bandpass', 1500 * k, 6, 0.7, 0.035); this.noise(0.03, 'bandpass', 3000 * k, 6, 0.4, 0.07);
    this.tone(120, 50, 0.2, 0.4); this.noise(0.09, 'lowpass', 480, 0.8, 0.4);
  },
  gravel() { this.tone(90, 40, 0.25, 0.4); for (let i = 0; i < 14; i++) this.noise(0.02 + Math.random() * 0.04, 'bandpass', 800 + Math.random() * 2500, 2, 0.15 + Math.random() * 0.25, Math.random() * 0.3); },
  // Mom, a few houses away and off to the left. pain: 0 (first hit) to 1 (last one)
  ow(pain) {
    if (!this.live()) return;
    const c = this.c, t = c.currentTime + 0.16, dur = 0.38 + pain * 0.18, f0 = 250 + Math.random() * 30;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.12, t + 0.06); o.frequency.exponentialRampToValueAtTime(f0 * 0.72, t + dur);
    const vib = c.createOscillator(); vib.frequency.value = 6; const vg = c.createGain(); vg.gain.value = 6; vib.connect(vg); vg.connect(o.frequency);
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 6; f1.frequency.setValueAtTime(800, t); f1.frequency.linearRampToValueAtTime(450, t + dur);
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 8; f2.frequency.setValueAtTime(1200, t); f2.frequency.linearRampToValueAtTime(850, t + dur);
    const g = c.createGain(); this.env(g, t, 0.8, dur, 0.03);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(lp); lp.connect(this.out(-0.5));
    o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
  },
  // Calzone the corgi: a sharp little "arf", lower than you'd expect
  yap(pan) { const f = 620 + Math.random() * 140; this.voice(f, f * 0.7, 0.11, 0.16, 'a', 0, pan, 1.5); this.noise(0.05, 'bandpass', 1500, 2, 0.08, 0, { pan }); },
  nip() { this.noise(0.05, 'highpass', 2500, 0.7, 0.3); this.tone(1500, 900, 0.09, 0.06, 'square', 0.02); this.tone(1700, 1100, 0.08, 0.05, 'square', 0.13); },
  // Dad on Mom's back: a run of satisfying pops, then a long relieved "ahh" from the kitchen
  backpop() {
    for (const [w, f] of [[0, 2600], [0.07, 1900], [0.13, 2300], [0.22, 1700]]) this.noise(0.03, 'bandpass', f, 6, 0.7, w);
    if (!this.live()) return;
    const c = this.c, t = c.currentTime + 0.35, dur = 0.9, f0 = 220;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * 1.15, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.82, t + dur);
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 6; f1.frequency.value = 780;
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 8; f2.frequency.value = 1150;
    const g = c.createGain(); this.env(g, t, 0.6, dur, 0.08);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(lp); lp.connect(this.out(-0.5));
    o.start(t); o.stop(t + dur + 0.05);
  },
  heartbeat() { this.tone(62, 42, 0.12, 0.35); this.tone(58, 40, 0.12, 0.22, 'sine', 0.2); },
  static() { this.noise(0.25, 'highpass', 1400, 0.5, 0.1); },

  // ---- world
  paper() { this.noise(0.07, 'highpass', 3200, 0.7, 0.25); this.noise(0.07, 'highpass', 4200, 0.7, 0.2, 0.09); this.tone(1320, 1320, 0.25, 0.06, 'sine', 0.12); this.tone(1760, 1760, 0.3, 0.05, 'sine', 0.2); },
  // a car passing left to right as you cross onto a new street
  car() {
    if (!this.live()) return;
    const c = this.c, t = c.currentTime, dur = 2.2, s = c.createBufferSource(); s.buffer = this.nb; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(700, t + dur * 0.5); f.frequency.exponentialRampToValueAtTime(240, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g);
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.setValueAtTime(-0.9, t); p.pan.linearRampToValueAtTime(0.9, t + dur); g.connect(p); p.connect(this.master); }
    else g.connect(this.master);
    s.start(t); s.stop(t + dur + 0.05);
  },
  // a squirrel scolding you from the middle of the sidewalk
  squeak(pan) { this.tone(2300, 3600, 0.07, 0.07, 'sine', 0, { pan }); this.tone(3300, 2100, 0.1, 0.05, 'sine', 0.08, { pan }); this.noise(0.05, 'highpass', 3000, 0.7, 0.08, 0, { pan }); },
  chitter(pan) { for (let i = 0; i < 7; i++) this.tone(2600 + Math.random() * 900, 3400 + Math.random() * 600, 0.025, 0.03, 'triangle', i * 0.055 + Math.random() * 0.015, { pan, always: true }); },
  // a lawnmower a few houses over: fades in, drones, fades out
  mower() {
    if (!this.c || !this.on) return;
    const c = this.c, t = c.currentTime, dur = 10 + Math.random() * 5, pan = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.4);
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(92, t);
    const wob = c.createOscillator(); wob.frequency.value = 0.35; const wg = c.createGain(); wg.gain.value = 6; wob.connect(wg); wg.connect(o.frequency);
    const n = c.createBufferSource(); n.buffer = this.nb; n.loop = true;
    const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.8;
    const ng = c.createGain(); ng.gain.value = 0.25;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + 3); g.gain.setValueAtTime(0.022, t + dur - 3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(f); n.connect(nf); nf.connect(ng); ng.connect(f); f.connect(g); g.connect(this.out(pan));
    o.start(t); wob.start(t); n.start(t); o.stop(t + dur); wob.stop(t + dur); n.stop(t + dur);
  },

  // ---- the neighborhood you hear but never see (plays on the title screen too)
  // a held note with a flat top, for horns
  hold(f, dur, peak, type, when, pan, lp) {
    if (!this.c || !this.on) return;
    const c = this.c, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = lp;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.025); g.gain.setValueAtTime(peak, t + dur - 0.04); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(fl); fl.connect(g); g.connect(this.out(pan)); o.start(t); o.stop(t + dur + 0.05);
  },
  // something voice-like: a buzzy tone through two vowel formants, muffled by distance
  voice(f0, f1, dur, peak, vowel, when, pan, fs = 1.18) {
    if (!this.c || !this.on) return;
    const c = this.c, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    const F = { a: [850, 1600], e: [480, 2300], o: [520, 950], u: [380, 850] }[vowel];
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    for (const [fq, k] of [[F[0], 1], [F[1], 0.55]]) {
      const b = c.createBiquadFilter(), bg = c.createGain(); b.type = 'bandpass'; b.frequency.value = fq * fs; b.Q.value = 5; bg.gain.value = k;
      o.connect(b); b.connect(bg); bg.connect(g);
    }
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.05, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(lp); lp.connect(this.out(pan)); o.start(t); o.stop(t + dur + 0.05);
  },
  // kids playing a few yards over: whoops, a laugh, a squeal, sometimes a ball
  kids(pan) {
    const n = 3 + (Math.random() * 4 | 0), P = d => Math.max(-0.9, Math.min(0.9, pan + d));
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 1.8, p = P((Math.random() - 0.5) * 0.4), f = 300 + Math.random() * 250, r = Math.random();
      if (r < 0.4) this.voice(f, f * (1.3 + Math.random() * 0.4), 0.22 + Math.random() * 0.25, 0.09, 'u', w, p);
      else if (r < 0.7) this.voice(f * 1.25, f * 0.85, 0.3 + Math.random() * 0.3, 0.08, 'a', w, p);
      else if (r < 0.88) for (let k = 0; k < 4; k++) this.voice(f * (1.15 - k * 0.05), f * (1.05 - k * 0.05), 0.08, 0.07, 'a', w + k * 0.12, p);
      else this.voice(f * 2.1, f * 2.7, 0.2, 0.05, 'e', w, p);
    }
    if (Math.random() < 0.35) { let w = 0.4, gap = 0.42; for (let k = 0; k < 5; k++) { this.tone(150, 85, 0.07, 0.07 * (1 - k * 0.16), 'sine', w, { pan, always: true }); w += gap; gap *= 0.7; } }
  },
  // a car going by on the cross street; loud is 0..1
  carBy(dir, loud) {
    if (!this.c || !this.on) return;
    const c = this.c, t = c.currentTime, dur = 2.6 + Math.random() * 1.6, mid = t + dur * 0.5, f0 = 55 + Math.random() * 30;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * 1.06, t); o.frequency.setValueAtTime(f0 * 1.06, mid - 0.2); o.frequency.exponentialRampToValueAtTime(f0 * 0.93, mid + 0.3);
    const of = c.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 240;
    const n = c.createBufferSource(); n.buffer = this.nb; n.loop = true;
    const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.Q.value = 0.7;
    nf.frequency.setValueAtTime(380, t); nf.frequency.exponentialRampToValueAtTime(950, mid); nf.frequency.exponentialRampToValueAtTime(330, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.014 + 0.036 * loud, mid); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(of); of.connect(g); n.connect(nf); nf.connect(g);
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.setValueAtTime(-0.85 * dir, t); p.pan.linearRampToValueAtTime(0.85 * dir, t + dur); g.connect(p); p.connect(this.master); }
    else g.connect(this.master);
    o.start(t); n.start(t, Math.random()); o.stop(t + dur + 0.05); n.stop(t + dur + 0.05);
  },
  // somebody leaning on a horn a block away: two quick honks or one long one
  horn(pan) {
    const f = 370 + Math.random() * 90, pat = Math.random() < 0.55 ? [[0, 0.15], [0.23, 0.17]] : [[0, 0.45 + Math.random() * 0.5]];
    for (const [w, d] of pat) for (const k of [1, 1.25]) this.hold(f * k, d, 0.011, 'square', w, pan, 1300);
  },
  // the ice cream truck, wandering past with its little tune (original, not a real truck's)
  truck(dir) {
    if (!this.c || !this.on) return;
    const c = this.c, t0 = c.currentTime + 0.05, beat = 0.19;
    const mel = [76, 79, 84, 79, 81, 79, 76, 72, 74, 76, 77, 81, 79, 0, 0, 0, 76, 79, 84, 79, 81, 84, 83, 81, 79, 76, 74, 77, 76, 72, 0, 0];
    const loops = 3, total = mel.length * beat * loops;
    const bus = c.createGain(), spk = c.createBiquadFilter();
    bus.gain.setValueAtTime(0.0001, t0); bus.gain.exponentialRampToValueAtTime(1, t0 + total * 0.5); bus.gain.exponentialRampToValueAtTime(0.0001, t0 + total);
    spk.type = 'bandpass'; spk.frequency.value = 1500; spk.Q.value = 0.9;               // a small tinny speaker on the roof
    bus.connect(spk);
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.setValueAtTime(-0.8 * dir, t0); p.pan.linearRampToValueAtTime(0.8 * dir, t0 + total); spk.connect(p); p.connect(this.master); }
    else spk.connect(this.master);
    const wob = c.createOscillator(), wg = c.createGain(); wob.frequency.value = 5; wg.gain.value = 14; wob.connect(wg); wob.start(t0); wob.stop(t0 + total + 0.5);
    for (let L = 0; L < loops; L++) mel.forEach((m, i) => {
      if (!m) return;
      const t = t0 + (L * mel.length + i) * beat, f = 440 * Math.pow(2, (m - 69) / 12);
      for (const [k, type, pk] of [[1, 'square', 0.03], [2, 'sine', 0.02]]) {
        const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f * k; wg.connect(o.detune);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 1.6);
        o.connect(g); g.connect(bus); o.start(t); o.stop(t + beat * 1.7);
      }
    });
  },
  // a mourning dove on a wire: coo-OO-oo, oo, oo
  dove(pan) {
    const o = { pan, always: true, att: 0.09 };
    this.tone(480, 520, 0.32, 0.02, 'sine', 0, o); this.tone(560, 470, 0.5, 0.026, 'sine', 0.38, o);
    this.tone(470, 440, 0.38, 0.018, 'sine', 1.05, o); this.tone(470, 440, 0.38, 0.016, 'sine', 1.6, o);
  },
  // crows, for the rougher streets
  crow(pan) {
    const n = 2 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) { const w = i * (0.4 + Math.random() * 0.12); this.voice(600, 450, 0.25, 0.1, 'a', w, pan, 1.4); this.noise(0.22, 'bandpass', 1400, 2, 0.025, w, { pan, always: true }); }
  },
  // a jackhammer somewhere on Quarry Ln
  hammer(pan) {
    const runs = 1 + (Math.random() * 2 | 0); let w = 0;
    for (let r = 0; r < runs; r++) { const n = 14 + (Math.random() * 14 | 0); for (let i = 0; i < n; i++) this.noise(0.03, 'bandpass', 650 + Math.random() * 300, 1.2, 0.15, w + i * 0.052, { pan, always: true }); w += n * 0.052 + 0.5 + Math.random() * 0.6; }
  },

  // ---- things that come at you
  // a skateboard's wheels on concrete, getting louder for dur seconds; returns a function that stops it early
  roll(dur, pan) {
    if (!this.live()) return () => {};
    const c = this.c, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.nb; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(380, t); f.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const trem = c.createGain(); trem.gain.value = 0.6;
    const lfo = c.createOscillator(); lfo.frequency.value = 13; const lg = c.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(trem.gain);
    s.connect(f); f.connect(trem); trem.connect(g); g.connect(this.out(pan));
    s.start(t, Math.random()); lfo.start(t); s.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    return () => { const n = c.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0.0001, n, 0.04); };
  },
  // a rubber kickball hitting the ground
  ballBounce(pan, loud) { this.tone(210, 130, 0.12, 0.12 * loud, 'sine', 0, { pan }); this.noise(0.05, 'lowpass', 500, 0.8, 0.1 * loud, 0, { pan }); },
  // the board cracking into your ankle and clattering off
  clack() { this.noise(0.04, 'bandpass', 1900, 2, 0.4); this.tone(320, 180, 0.08, 0.15, 'triangle'); for (let i = 1; i < 4; i++) this.noise(0.03, 'bandpass', 1500 + Math.random() * 800, 2, 0.18 / i, i * 0.11 + Math.random() * 0.03); this.scuff(); },
  // both feet leaving the ground, and coming back down together
  jump() { this.noise(0.22, 'bandpass', 420, 0.9, 0.12, 0, { f1: 1700, att: 0.05 }); this.tone(240, 380, 0.14, 0.06, 'triangle'); },
  jumpLand() { this.noise(0.09, 'lowpass', 380, 0.8, 0.6); this.noise(0.08, 'lowpass', 320, 0.8, 0.45, 0.025); this.tone(90, 45, 0.18, 0.3); },

  // ---- power-ups
  // heelies: little wheels humming on concrete until stopped; returns the stop function
  glide() {
    if (!this.live()) return () => {};
    const c = this.c, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.nb; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.8;
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 180; const og = c.createGain(); og.gain.value = 0.25;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.4);
    s.connect(f); f.connect(g); o.connect(og); og.connect(g); g.connect(this.master); s.start(t, Math.random()); o.start(t);
    return () => { const n = c.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0.0001, n, 0.08); s.stop(n + 0.5); o.stop(n + 0.5); };
  },
  // the wheels clicking over a joint between slabs
  tick() { this.noise(0.025, 'bandpass', 2400, 2, 0.12); this.tone(900, 700, 0.03, 0.04, 'square'); },
  // moon shoes: a big springy boing up, and a wobbly landing
  boing() { this.tone(180, 620, 0.32, 0.09, 'triangle'); this.tone(360, 1240, 0.28, 0.03, 'sine', 0.02); this.noise(0.2, 'bandpass', 500, 0.9, 0.08, 0, { f1: 1800, att: 0.05 }); },
  moonLand() { this.noise(0.08, 'lowpass', 400, 0.8, 0.5); this.tone(90, 50, 0.2, 0.3); for (let i = 0; i < 6; i++) this.tone(i % 2 ? 300 : 360, i % 2 ? 290 : 350, 0.07, 0.06 * (1 - i / 6), 'triangle', 0.05 + i * 0.06); },

  // a message landing in the family chat; each person pings at their own pitch
  ping(k = 1) { this.tone(1568 * k, 1570 * k, 0.09, 0.045, 'triangle'); this.tone(2093 * k, 2095 * k, 0.12, 0.035, 'triangle', 0.08); },
  ring() { for (const w of [0, 0.55]) { this.tone(440, 440, 0.42, 0.09, 'sine', w); this.tone(480, 480, 0.42, 0.09, 'sine', w); this.tone(115, 115, 0.42, 0.035, 'sawtooth', w); } },

  // ---- streaks and giant steps
  chime(n) { const notes = [523, 587, 659, 784, 880, 1047, 1175, 1319], f = notes[Math.min(n, notes.length - 1)]; this.tone(f, f * 1.001, 0.2, 0.07, 'triangle'); this.tone(f * 2, f * 2.002, 0.14, 0.025, 'sine', 0.02); },
  earn() { [659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f * 1.001, 0.18, 0.07, 'triangle', i * 0.07)); },
  newbest() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, f * 1.001, 0.2, 0.06, 'triangle', i * 0.08)); },
  arm() { this.noise(0.28, 'bandpass', 500, 1, 0.09, 0, { f1: 2600, att: 0.22 }); this.tone(392, 784, 0.28, 0.05, 'triangle'); },
  disarm() { this.tone(784, 392, 0.15, 0.04, 'triangle'); },

  // ---- menus (these play even while the demo walk is quiet)
  click() { this.noise(0.015, 'highpass', 2000, 0.7, 0.3, 0, { always: true }); this.tone(1800, 1200, 0.03, 0.05, 'square', 0, { always: true }); },
  start() { [392, 523, 659].forEach((f, i) => this.tone(f, f * 1.001, 0.16, 0.06, 'triangle', i * 0.06, { always: true })); this.noise(0.08, 'lowpass', 480, 0.8, 0.45, 0.2, { always: true }); }
};
