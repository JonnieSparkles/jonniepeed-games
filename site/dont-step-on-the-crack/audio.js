// Don't Step on the Crack: every sound is synthesized with Web Audio, no files.
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
  // the chihuahua
  yap(pan) { const f = 1150 + Math.random() * 250; this.tone(f, f * 0.66, 0.07, 0.05, 'square', 0, { pan }); this.noise(0.04, 'bandpass', 2300, 3, 0.12, 0, { pan }); },
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
