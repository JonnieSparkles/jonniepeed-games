// Procedural sound. Classic script; load before game.js. Storage stays in the game.
// API: init(), play(name), ambience(state) once per frame or so, and the muted flag.
var StickArmySound = (function () {
  'use strict';

  // ---------- sound ----------
  var AC = null, master = null, noiseBuf = null, muted = false, lastPlay = {};
  function audioInit() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = 0.32; master.connect(AC.destination);
      noiseBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.6), AC.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { AC = null; }
  }
  function tone(f, dur, type, vol, f2, delay) {
    var t0 = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noise(dur, vol, freq, delay, type) {
    var t0 = AC.currentTime + (delay || 0), s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; f.type = type || 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + 0.03);
  }
  // A soft brass note: sawtooth through a lowpass with a quick swell, for the bugle call.
  function brass(f, dur, vol, delay) {
    var t0 = AC.currentTime + (delay || 0), o = AC.createOscillator(), fl = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t0);
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t0); fl.frequency.linearRampToValueAtTime(1800, t0 + 0.05);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(fl); fl.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  var SFX = {
    shoot: function () { noise(0.05, 0.08, 3000); tone(260, 0.05, 'square', 0.025, 120); },
    ally: function () { noise(0.04, 0.05, 2200); },
    rocket: function () { noise(0.25, 0.1, 900); },
    pop: function () { tone(880, 0.09, 'triangle', 0.16, 320); },
    boing: function () { tone(140, 0.16, 'sine', 0.32, 520); tone(520, 0.22, 'sine', 0.2, 260, 0.15); },
    splat: function () { noise(0.2, 0.32, 650); },
    squash: function () { noise(0.22, 0.34, 520); tone(190, 0.28, 'sawtooth', 0.09, 55); tone(95, 0.2, 'sine', 0.18, 50, 0.04); },
    hit: function () { noise(0.07, 0.18, 1600); tone(320, 0.06, 'square', 0.05, 160); },
    boom: function () { noise(0.55, 0.45, 420); tone(90, 0.4, 'sine', 0.3, 40); },
    clank: function () { tone(1300, 0.06, 'square', 0.06, 900); },
    recruit: function () { tone(660, 0.1, 'triangle', 0.18); tone(990, 0.18, 'triangle', 0.18, null, 0.09); },
    noo: function () { tone(420, 0.3, 'sawtooth', 0.06, 180); },
    thud: function () { tone(110, 0.08, 'sine', 0.15, 70); },
    thump: function () { noise(0.06, 0.12, 400); },
    tink: function () { tone(1800, 0.04, 'triangle', 0.04); },
    whistle: function () { tone(1500, 0.9, 'sine', 0.07, 180); },
    overheat: function () { noise(0.75, 0.13, 3500, 0, 'highpass'); tone(320, 0.4, 'square', 0.035, 110); },
    ready: function () { tone(1250, 0.05, 'triangle', 0.06); tone(1650, 0.07, 'triangle', 0.06, null, 0.06); },
    pizza: function () { tone(660,0.12,'triangle',0.18); tone(880,0.12,'triangle',0.18,null,0.14); tone(1320,0.24,'triangle',0.18,null,0.28); },
    sniper: function () { noise(0.06, 0.16, 3200); tone(900, 0.08, 'triangle', 0.08, 250); },
    // Wave start: a short bugle call. Wave clear keeps the bright arpeggio.
    bugle: function () { brass(392, 0.14, 0.07); brass(523, 0.14, 0.07, 0.14); brass(659, 0.14, 0.07, 0.28); brass(784, 0.5, 0.08, 0.42); },
    wave: function () { tone(523, 0.12, 'triangle', 0.15); tone(659, 0.12, 'triangle', 0.15, null, 0.12); tone(784, 0.22, 'triangle', 0.15, null, 0.24); },
    shop: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.07, null, i * 0.09); }); },
    // New threats: a rush (a sharp whistle and a yell), tank cannon (a dull thump), and the friendly bomber (a
    // rising engine roar under a bright two-note horn).
    rush: function () { tone(2200, 0.12, 'square', 0.04, 1900); tone(2200, 0.18, 'square', 0.04, 1800, 0.16); noise(0.3, 0.08, 1400, 0.05, 'bandpass'); },
    cannon: function () { noise(0.3, 0.3, 300); tone(70, 0.3, 'sine', 0.22, 40); },
    strike: function () { tone(70, 1.6, 'sawtooth', 0.05, 140); noise(1.6, 0.06, 600); brass(587, 0.18, 0.07, 0.1); brass(784, 0.4, 0.08, 0.28); },
    // Zeppelin: a low two-note horn on arrival and when it turns angry, a soft canvas thup per hit, a groan going down.
    horn: function () { brass(98, 0.8, 0.09); brass(73.4, 1.2, 0.09, 0.7); },
    thup: function () { noise(0.05, 0.1, 900); tone(210, 0.06, 'sine', 0.07, 120); },
    zepdown: function () { tone(150, 1.8, 'sawtooth', 0.05, 40); noise(1.4, 0.32, 380); tone(70, 1.2, 'sine', 0.25, 30, 0.2); },
    over: function () { tone(392, 0.2, 'triangle', 0.15); tone(330, 0.2, 'triangle', 0.15, null, 0.2); tone(262, 0.45, 'triangle', 0.15, null, 0.4); }
  };
  function sfx(name) {
    if (!AC || muted) return;
    var now = performance.now();
    if (lastPlay[name] && now - lastPlay[name] < 45) return;
    lastPlay[name] = now;
    try { SFX[name](); } catch (e) { /* ignore */ }
  }

  // ---------- ambience ----------
  // A snare-and-bass-drum march that gets busier as the waves climb, a pool of three propeller drones that
  // follow and pan with the nearest planes, and a heartbeat in place of the bass drum while the wall is low.
  // Everything runs through one bus that fades out whenever the game isn't in active play.
  var amb = null;
  function ambInit() {
    if (amb || !AC) return;
    try {
      var bus = AC.createGain(); bus.gain.value = 0; bus.connect(master);
      var drums = AC.createGain(); drums.gain.value = 0.75; drums.connect(bus);
      var voices = [];
      for (var v = 0; v < 3; v++) {
        var o = AC.createOscillator(), o2 = AC.createOscillator(), f = AC.createBiquadFilter();
        var trem = AC.createGain(), prop = AC.createOscillator(), depth = AC.createGain(), g = AC.createGain();
        var pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
        o.type = 'sawtooth'; o.frequency.value = 80; o2.type = 'square'; o2.frequency.value = 81.6;
        f.type = 'lowpass'; f.frequency.value = 380;
        trem.gain.value = 0.65; prop.frequency.value = 15 + v * 2; depth.gain.value = 0.35;
        prop.connect(depth); depth.connect(trem.gain);
        g.gain.value = 0;
        o.connect(f); o2.connect(f); f.connect(trem); trem.connect(g);
        if (pan) { g.connect(pan); pan.connect(bus); } else g.connect(bus);
        o.start(); o2.start(); prop.start();
        voices.push({ o: o, o2: o2, g: g, pan: pan });
      }
      amb = { bus: bus, drums: drums, voices: voices, nextBeat: 0, marching: false, nextStep: 0, step: 0, bar: 0 };
    } catch (e) { amb = null; }
  }

  // Drum voices, scheduled at time t onto the drum bus.
  function snare(t, vol) {
    var s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.7;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    s.connect(f); f.connect(g); g.connect(amb.drums); s.start(t, Math.random() * 0.4); s.stop(t + 0.15);
    var o = AC.createOscillator(), og = AC.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(230, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.05);
    og.gain.setValueAtTime(vol * 0.7, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(og); og.connect(amb.drums); o.start(t); o.stop(t + 0.08);
  }
  function drum(t, f1, f2, dur, vol) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.7);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(amb.drums); o.start(t); o.stop(t + dur + 0.03);
  }
  function heart(t) { drum(t, 62, 52, 0.14, 0.2); drum(t + 0.22, 54, 46, 0.16, 0.15); }

  // One sixteenth of the march. Waves 1-3 keep a plain left-right step with a backbeat and a roll every
  // fourth bar; from wave 4 ghost notes and a roll every other bar; from wave 9 a pickup kick, steady
  // ghost notes and a roll into every bar. A zeppelin adds a low timpani on each downbeat.
  function marchStep(i, bar, wave, t, dt, low, boss) {
    var tier = wave >= 9 ? 2 : wave >= 4 ? 1 : 0;
    var roll = tier === 2 || (tier === 1 ? bar % 2 === 1 : bar % 4 === 3);
    if (low) { if (i === 0 || i === 8) heart(t); }
    else if (i === 0 || i === 8) drum(t, 120, 44, 0.3, i === 0 ? 0.18 : 0.14);
    else if ((tier === 2 && i === 14) || (tier === 1 && i === 6 && bar % 2)) drum(t, 110, 44, 0.24, 0.1);
    if (boss && i === 0) drum(t, 82, 58, 0.7, 0.16);
    if (i === 4 || i === 12) { snare(t - 0.02, 0.03); snare(t, 0.1); }
    else if (roll && i >= 13) { var v = 0.034 + (i - 13) * 0.016; snare(t, v); snare(t + dt / 2, v * 0.8); }
    else if (tier === 2 && i % 2 === 1) snare(t, 0.024);
    else if (tier === 1 && (i === 2 || i === 10)) snare(t, 0.03);
  }

  // state: { active, planes: [{ x, dir, kind }], wave (true while a wave is running), number (the wave), wallLow }
  function ambience(state) {
    if (!AC) return;
    ambInit();
    if (!amb) return;
    var now = AC.currentTime, on = !muted && !!state.active;
    amb.bus.gain.setTargetAtTime(on ? 1 : 0, now, on ? 0.6 : 0.2);
    var planes = (state.planes || []).slice().sort(function (a, b) { return Math.abs(a.x - 200) - Math.abs(b.x - 200); });
    amb.voices.forEach(function (v, i) {
      var p = planes[i];
      if (!on || !p) { v.g.gain.setTargetAtTime(0, now, 0.25); return; }
      // Slightly higher pitch while approaching the middle, lower while leaving.
      var zep = p.kind === 'zeppelin', base = zep ? 44 : p.kind === 'cargo' ? 50 : p.kind === 'bomber' ? 56 : 80, doppler = (200 - p.x) * p.dir > 0 ? 1.04 : 0.96;
      var near = 1 - Math.min(1, Math.abs(p.x - 200) / 260);
      v.o.frequency.setTargetAtTime(base * doppler, now, 0.25);
      v.o2.frequency.setTargetAtTime(base * doppler * 1.02, now, 0.25);
      v.g.gain.setTargetAtTime(zep ? 0.03 + 0.03 * near : 0.01 + 0.03 * near, now, 0.15);
      if (v.pan) v.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, (p.x - 200) / 220)), now, 0.1);
    });
    // The march is scheduled a little ahead of the clock. After a stall it restarts on a fresh bar.
    if (on && state.wave) {
      if (!amb.marching || amb.nextStep < now) { amb.marching = true; amb.nextStep = now + 0.08; amb.step = 0; amb.bar = 0; }
      var n = state.number || 1, bpm = Math.min(124, 106 + Math.max(0, n - 3) * 1.5), dt = 60 / bpm / 4;
      var boss = planes.some(function (p) { return p.kind === 'zeppelin'; });
      while (amb.nextStep < now + 0.3) {
        marchStep(amb.step, amb.bar, n, amb.nextStep, dt, !!state.wallLow, boss);
        amb.nextStep += dt;
        if (++amb.step === 16) { amb.step = 0; amb.bar++; }
      }
    } else {
      amb.marching = false;
      if (on && state.wallLow && now >= amb.nextBeat) { heart(now); amb.nextBeat = now + 0.95; }
    }
  }

  return {
    init: audioInit,
    play: sfx,
    ambience: ambience,
    get muted() { return muted; },
    set muted(value) { muted = !!value; }
  };
})();
