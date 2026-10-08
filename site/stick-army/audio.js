// Procedural sound. Classic script; load before game.js. Storage stays in the game.
// API: init(), play(name), say(text, voice, enemy, delay) for the little voices, ambience(state) once per frame or
// so, and the muted flag.
var StickArmySound = (function () {
  'use strict';

  // ---------- sound ----------
  var AC = null, master = null, noiseBuf = null, muted = false, lastPlay = {}, LEVEL = 0.8;
  function audioInit() {
    unlockSpeech();
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      // Phones played it quietly, so the mix runs hotter, through a gentle soft clip that rounds off the rare peak
      // when many sounds stack up instead of distorting. (A compressor node squashed short hits.)
      var soft = AC.createWaveShaper(), curve = new Float32Array(1025);
      for (var k = 0; k < curve.length; k++) { var x = k / 512 - 1; curve[k] = Math.tanh(1.4 * x) / Math.tanh(1.4); }
      soft.curve = curve; soft.connect(AC.destination);
      master = AC.createGain(); master.gain.value = LEVEL; master.connect(soft);
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
    // A pen sketching something onto the page: a few quick scratches.
    scribble: function () { for (var i = 0; i < 4; i++) noise(0.06, 0.05, 5200, i * 0.11, 'highpass'); },
    // A walkie-talkie: a burst of static, then two beeps.
    radio: function () { noise(0.22, 0.12, 2600, 0, 'bandpass'); tone(1400, 0.05, 'square', 0.035, null, 0.24); tone(1400, 0.05, 'square', 0.035, null, 0.32); noise(0.12, 0.06, 2600, 0.42, 'bandpass'); },
    // Fighter cover: a fast engine whine that climbs as it dives in.
    fighter: function () { tone(160, 0.9, 'sawtooth', 0.045, 480); noise(0.7, 0.05, 1800, 0, 'bandpass'); brass(784, 0.12, 0.06, 0.15); brass(988, 0.3, 0.07, 0.28); },
    strike: function () { tone(70, 1.6, 'sawtooth', 0.05, 140); noise(1.6, 0.06, 600); brass(587, 0.18, 0.07, 0.1); brass(784, 0.4, 0.08, 0.28); },
    // Zeppelin: a low two-note horn on arrival and when it turns angry, a soft canvas thup per hit, a groan going down.
    horn: function () { brass(98, 0.8, 0.09); brass(73.4, 1.2, 0.09, 0.7); },
    thup: function () { noise(0.05, 0.1, 900); tone(210, 0.06, 'sine', 0.07, 120); },
    zepdown: function () { tone(150, 1.8, 'sawtooth', 0.05, 40); noise(1.4, 0.32, 380); tone(70, 1.2, 'sine', 0.25, 30, 0.2); },
    // The Dreadnought: a deep rumble as it shows through the page, the paper tearing as it bursts through, a hissing
    // flare on each target, the heavy gun, and a klaxon when the bridge is exposed. Beating it plays a fanfare.
    rumble: function () { noise(2.6, 0.22, 150); tone(42, 2.6, 'sine', 0.22, 31); },
    rip: function () { for (var i = 0; i < 10; i++) noise(0.06, 0.13, 3200 - i * 220, i * 0.035, 'bandpass'); noise(0.45, 0.12, 1200, 0.05, 'highpass'); },
    flare: function () { noise(0.7, 0.07, 4200, 0, 'highpass'); tone(900, 0.45, 'sine', 0.025, 1500); },
    broadside: function () { noise(0.7, 0.5, 280); tone(56, 0.7, 'sine', 0.38, 28); noise(0.1, 0.25, 2200); },
    klaxon: function () { [0, 0.32, 0.64, 0.96].forEach(function (d, i) { tone(i % 2 ? 350 : 440, 0.28, 'square', 0.045, null, d); }); },
    // The sky (sky.js): a dive bomber's rising siren, a helicopter's chop, and a sour buzz for hitting the Red Cross.
    // A dive bomber tipping over: a short, low, rising howl (two detuned saws through a lowpass) rather than a whistle.
    siren: function () {
      var t0 = AC.currentTime, f = AC.createBiquadFilter(), g = AC.createGain();
      f.type = 'lowpass'; f.frequency.setValueAtTime(700, t0); f.frequency.linearRampToValueAtTime(1300, t0 + 0.9);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.15); g.gain.setValueAtTime(0.06, t0 + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
      [1, 1.012].forEach(function (k) {
        var o = AC.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(170 * k, t0); o.frequency.exponentialRampToValueAtTime(330 * k, t0 + 0.9);
        o.connect(f); o.start(t0); o.stop(t0 + 1.15);
      });
      f.connect(g); g.connect(master);
    },
    // The Red Cross plane coming in: a soft two-tone chime. HQ's supply plane: an engine and a bright little horn.
    medevac: function () { tone(988, 0.22, 'sine', 0.09); tone(784, 0.3, 'sine', 0.09, null, 0.24); tone(988, 0.22, 'sine', 0.07, null, 0.6); tone(784, 0.3, 'sine', 0.07, null, 0.84); },
    hq: function () { tone(90, 1.1, 'sawtooth', 0.035, 150); brass(659, 0.12, 0.06, 0.2); brass(880, 0.25, 0.065, 0.34); },
    chopper: function () { for (var i = 0; i < 12; i++) { noise(0.07, 0.16 - i * 0.008, 260, i * 0.11); tone(58, 0.06, 'sine', 0.12 - i * 0.006, 44, i * 0.11); } },
    wrong: function () { tone(196, 0.18, 'square', 0.1); tone(139, 0.45, 'square', 0.1, null, 0.19); noise(0.3, 0.06, 500, 0.19); },
    victory: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { brass(f, i === 3 ? 0.5 : 0.15, 0.08, i * 0.17); });
      brass(880, 0.15, 0.07, 1.05); brass(988, 0.15, 0.07, 1.2); brass(1047, 1.1, 0.08, 1.35);
      [523, 659, 784].forEach(function (f) { brass(f, 1.1, 0.045, 1.35); });
    },
    over: function () { tone(392, 0.2, 'triangle', 0.15); tone(330, 0.2, 'triangle', 0.15, null, 0.2); tone(262, 0.45, 'triangle', 0.15, null, 0.4); }
  };
  // ---------- little voices ----------
  // Real words in tiny voices: the browser's own speech (speechSynthesis), pitched up and quick for the squad, low
  // and slow for the enemy, each speaker a little different (from his id). The game shows a speech bubble with the
  // line, so you see who's talking. Speech can't overlap, so a line is dropped while another is still being said or
  // within SPEECH.GAP seconds of the last. Phones and browsers each have their own voices, so it sounds a bit different
  // on each. Where speech isn't available (or has no voices) the old gibberish chatter stands in: a syllable for each
  // vowel in the line through that vowel's formants (VOWELS), lines closer than SAY.GAP dropped.
  var SAY = { GAP: 0.2, VOL: 0.12 }, lastSay = -1;
  var SPEECH = { GAP: 0.5, VOLUME: 0.9 }, synth = window.speechSynthesis || null, speechVoice = null, lastSpeech = -9, unlocked = false;
  function pickVoice() {
    var list = synth ? synth.getVoices() : [];
    if (!list.length) return;
    var en = list.filter(function (v) { return /^en/i.test(v.lang); });
    speechVoice = en.find(function (v) { return v.localService; }) || en[0] || list[0];
  }
  if (synth) { pickVoice(); if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice); }
  // iPhones only speak after speech has started inside a tap: a silent line on the first tap opens it up.
  function unlockSpeech() {
    if (!synth || unlocked) return;
    unlocked = true;
    try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) { /* ignore */ }
  }
  // Formants per vowel, and a level for each so they come out about equally loud.
  var VOWELS = { a: [730, 1090, 0.65], e: [530, 1840, 0.85], i: [300, 2200, 1.2], o: [570, 840, 1], u: [320, 900, 1.2], y: [300, 2200, 1.2] };
  function say(text, voice, enemy, delay) {
    if (muted) return;
    var h = Math.imul((voice | 0) + 7, 2654435761) >>> 0;
    if (synth && speechVoice) {
      var at = performance.now() / 1000 + (delay || 0);
      if (at - lastSpeech < SPEECH.GAP || synth.pending) return;
      lastSpeech = at;
      setTimeout(function () {
        if (muted || document.hidden) return;
        try {
          var u = new SpeechSynthesisUtterance(String(text));
          u.voice = speechVoice; u.volume = SPEECH.VOLUME;
          u.pitch = enemy ? 0.3 + (h % 3) * 0.1 : 1.6 + (h % 5) * 0.1;
          u.rate = enemy ? 1.25 : 1.55 + (h % 3) * 0.1;
          synth.speak(u);
        } catch (e) { /* ignore */ }
      }, (delay || 0) * 1000);
      return;
    }
    if (!AC) return;
    var t = AC.currentTime + (delay || 0);
    if (Math.abs(t - lastSay) < SAY.GAP) return;
    lastSay = t;
    var base = enemy ? 118 + (h % 5) * 11 : 220 + (h % 7) * 22;
    var vowels = (String(text).toLowerCase().match(/[aeiouy]/g) || ['a']).slice(0, 4), lift = /!$/.test(text);
    try {
      vowels.forEach(function (v, i) {
        var d = 0.07 + ((h >>> (i * 3)) & 3) * 0.012, f = base * (1 + ((h >>> (i * 2 + 9)) & 3) * 0.07) * (lift && i === vowels.length - 1 ? 1.3 : 1);
        syllable(t, f, d, VOWELS[v], enemy);
        t += d + 0.035;
      });
    } catch (e) { /* ignore */ }
  }
  function syllable(t, f, d, formants, enemy) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = enemy ? 'sawtooth' : 'square';
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (enemy ? 0.85 : 0.93), t + d);
    var vol = SAY.VOL * formants[2] * (enemy ? 1.6 : 1);
    formants.slice(0, 2).forEach(function (F, i) {
      var bp = AC.createBiquadFilter(), lvl = AC.createGain();
      bp.type = 'bandpass'; bp.frequency.value = F; bp.Q.value = 4; lvl.gain.value = i ? 0.6 : 1;
      o.connect(bp); bp.connect(lvl); lvl.connect(g);
    });
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.setValueAtTime(vol, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    g.connect(master); o.start(t); o.stop(t + d + 0.02);
  }

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
  // A brass note at time t on the ambience bus: sawtooth through a lowpass that opens as it swells.
  function brassAt(t, f, dur, vol) {
    var o = AC.createOscillator(), fl = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(f * 4, t); fl.frequency.linearRampToValueAtTime(f * 9, t + 0.08);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.04); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(amb.drums); o.start(t); o.stop(t + dur + 0.03);
  }
  function timp(t, f, vol) { drum(t, f * 1.06, f, 0.9, vol); drum(t, f * 2.02, f * 2, 0.35, vol * 0.25); }

  // The Dreadnought's march, original to this game: a minor-key low brass figure over two bars, timpani on the
  // downbeats, a horn call every fourth bar, and snares. Once the bridge is exposed it speeds up, the horn calls
  // come every other bar and the snares fill in. Steps are sixteenths; notes are [step, Hz, length in steps].
  var D2 = 73.42, E2 = 82.41, F2 = 87.31, G2 = 98, A1 = 55, CS2 = 69.3, A3 = 220, CS4 = 277.18, D4 = 293.66, E4 = 329.63, F4 = 349.23;
  var DREAD_BASS = [[[0, D2, 3], [3, D2, 3], [6, F2, 2], [8, E2, 3], [11, D2, 3], [14, A1, 2]],
    [[0, D2, 3], [3, D2, 3], [6, G2, 2], [8, F2, 3], [11, E2, 2], [13, CS2, 3]]];
  var DREAD_CALL = [[[0, A3, 6], [6, D4, 2], [8, F4, 4], [12, E4, 4]], [[0, D4, 4], [4, CS4, 4], [8, A3, 8]]];
  function dreadStep(i, bar, t, dt, bridge) {
    DREAD_BASS[bar % 2].forEach(function (n) { if (n[0] === i) brassAt(t, n[1], n[2] * dt * 0.95, 0.05); });
    var callBar = bridge ? bar % 2 : bar % 4 - 2;
    if (callBar === 0 || callBar === 1) DREAD_CALL[callBar].forEach(function (n) { if (n[0] === i) brassAt(t, n[1], n[2] * dt * 0.95, 0.032); });
    if (i === 0) timp(t, D2, 0.24); else if (i === 8) timp(t, A1, 0.2); else if (bridge && i === 12) timp(t, D2, 0.12);
    if (i === 4 || i === 12) { snare(t - 0.02, 0.03); snare(t, 0.1); }
    else if (bridge && i % 2 === 1) snare(t, 0.026);
    if ((bridge || bar % 4 === 3) && i >= 13) { snare(t, 0.04 + (i - 13) * 0.02); snare(t + dt / 2, 0.035); }
  }

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

  // state: { active, planes: [{ x, dir, kind }], wave (true while a wave is running), number (the wave), wallLow,
  //   dread (the Dreadnought's phase, or null) }
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
      var zep = p.kind === 'zeppelin' || p.kind === 'dread' || p.kind === 'heli', base = p.kind === 'dread' ? 34 : p.kind === 'heli' ? 38 : zep ? 44 : p.kind === 'cargo' ? 50 : p.kind === 'bomber' ? 56 : p.kind === 'diver' ? 96 : 80, doppler = (200 - p.x) * p.dir > 0 ? 1.04 : 0.96;
      var near = 1 - Math.min(1, Math.abs(p.x - 200) / 260);
      v.o.frequency.setTargetAtTime(base * doppler, now, 0.25);
      v.o2.frequency.setTargetAtTime(base * doppler * 1.02, now, 0.25);
      v.g.gain.setTargetAtTime(zep ? 0.03 + 0.03 * near : 0.01 + 0.03 * near, now, 0.15);
      if (v.pan) v.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, (p.x - 200) / 220)), now, 0.1);
    });
    // The march is scheduled a little ahead of the clock. After a stall it restarts on a fresh bar.
    if (on && state.wave) {
      if (!amb.marching || amb.nextStep < now) { amb.marching = true; amb.nextStep = now + 0.08; amb.step = 0; amb.bar = 0; }
      // The Dreadnought brings its own march once it's through the page.
      var dreadOn = state.dread === 'guns' || state.dread === 'bridge', bridge = state.dread === 'bridge';
      var n = state.number || 1, bpm = dreadOn ? (bridge ? 104 : 96) : Math.min(124, 106 + Math.max(0, n - 3) * 1.5), dt = 60 / bpm / 4;
      var boss = planes.some(function (p) { return p.kind === 'zeppelin'; });
      while (amb.nextStep < now + 0.3) {
        if (dreadOn) dreadStep(amb.step, amb.bar, amb.nextStep, dt, bridge);
        else marchStep(amb.step, amb.bar, n, amb.nextStep, dt, !!state.wallLow, boss);
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
    say: say,
    ambience: ambience,
    get muted() { return muted; },
    set muted(value) { muted = !!value; if (muted && synth) synth.cancel(); }
  };
})();
