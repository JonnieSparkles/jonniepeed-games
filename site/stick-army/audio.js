// Procedural sound. Classic script; load before game.js. Storage stays in the game.
// API: init(), play(name), say(text, voice, enemy, delay) for the little voices, ambience(state) once per frame or
// so, and the muted flag.
var StickArmySound = (function () {
  'use strict';

  // ---------- sound ----------
  var AC = null, master = null, fx = null, route = null, noiseBuf = null, muted = false, lastPlay = {}, LEVEL = 0.8, NOISE_LEN = 3;
  function audioInit() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      // Phones played it quietly, so the mix runs hotter, through a gentle soft clip that rounds off the rare peak
      // when many sounds stack up instead of distorting. (A compressor node squashed short hits.)
      var soft = AC.createWaveShaper(), curve = new Float32Array(1025);
      for (var k = 0; k < curve.length; k++) { var x = k / 512 - 1; curve[k] = Math.tanh(1.4 * x) / Math.tanh(1.4); }
      soft.curve = curve; soft.connect(AC.destination);
      master = AC.createGain(); master.gain.value = muted ? 0 : LEVEL; master.connect(soft);
      // Effects and voices go through fx, which the title closes: its demo plays silently under the music, and only
      // the buttons (UI, straight to master) are heard.
      fx = AC.createGain(); fx.connect(master); route = fx;
      // Three seconds of noise, longer than any noise layer asks for (the Dreadnought's rumble wants 2.6 s). It was
      // 0.6 s, which cut the noise out of every longer sound early.
      noiseBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * NOISE_LEN), AC.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { AC = null; }
  }
  function tone(f, dur, type, vol, f2, delay) {
    var t0 = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(route); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noise(dur, vol, freq, delay, type) {
    var t0 = AC.currentTime + (delay || 0), s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; f.type = type || 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(route); s.start(t0, Math.random() * (NOISE_LEN - Math.min(NOISE_LEN, dur + 0.05))); s.stop(t0 + dur + 0.03);
  }
  // A soft brass note: sawtooth through a lowpass with a quick swell, for the bugle call.
  function brass(f, dur, vol, delay) {
    var t0 = AC.currentTime + (delay || 0), o = AC.createOscillator(), fl = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t0);
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t0); fl.frequency.linearRampToValueAtTime(1800, t0 + 0.05);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(fl); fl.connect(g); g.connect(route); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  // A soft held brass note (as in the march), for the shop's "at ease".
  function soft(f, dur, vol, delay) {
    var t = AC.currentTime + (delay || 0), o = AC.createOscillator(), fl = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(f * 4, t); fl.frequency.linearRampToValueAtTime(f * 9, t + 0.08);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.04); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(fx); o.start(t); o.stop(t + dur + 0.03);
  }
  // A klaxon blast, "a-OOO-gah": two buzzing horns a fifth apart swoop up, hold, then sag, through a honky bandpass
  // with a little rasp, so it reads as an alarm and not a beep.
  function honk(delay) {
    var t0 = AC.currentTime + (delay || 0), g = AC.createGain(), bp = AC.createBiquadFilter(), sh = AC.createWaveShaper(), c = new Float32Array(257);
    for (var k = 0; k < c.length; k++) { var x = k / 128 - 1; c[k] = Math.tanh(3 * x); }
    sh.curve = c; bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = 1.3;
    [[1, 'sawtooth', 0.11], [1.5, 'square', 0.05]].forEach(function (h) {
      var o = AC.createOscillator(), og = AC.createGain();
      o.type = h[1]; o.frequency.setValueAtTime(150 * h[0], t0); o.frequency.exponentialRampToValueAtTime(330 * h[0], t0 + 0.14);
      o.frequency.setValueAtTime(330 * h[0], t0 + 0.42); o.frequency.exponentialRampToValueAtTime(250 * h[0], t0 + 0.62);
      og.gain.value = h[2]; o.connect(og); og.connect(sh); o.start(t0); o.stop(t0 + 0.66);
    });
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.03); g.gain.setValueAtTime(0.5, t0 + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.64);
    sh.connect(bp); bp.connect(g); g.connect(fx);
    noise(0.55, 0.03, 1400, delay, 'bandpass');
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
    // Falling bombs, one sound per kind so you can tell what's coming: the carpet bomber's plain whistle (a balloon's
    // bomb too: its slide whistle was dropped); a heavy bomb (dive bombers, heavy bombers) a deep wobbling scream with a
    // rumble; a cluster (zeppelins, the Dreadnought's bay) three whistles one after another.
    whistle: function () { tone(1500, 0.9, 'sine', 0.07, 180); },
    heavy: function () {
      var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(), lfo = AC.createOscillator(), ld = AC.createGain(), fl = AC.createBiquadFilter(), trem = AC.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(110, t + 1.7);
      lfo.frequency.setValueAtTime(5, t); lfo.frequency.linearRampToValueAtTime(11, t + 1.7); ld.gain.value = 0.35;
      fl.type = 'lowpass'; fl.frequency.value = 1400; trem.gain.value = 0.65; lfo.connect(ld); ld.connect(trem.gain);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.055, t + 0.2); g.gain.setValueAtTime(0.055, t + 1.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.75);
      o.connect(fl); fl.connect(trem); trem.connect(g); g.connect(fx); o.start(t); lfo.start(t); o.stop(t + 1.8); lfo.stop(t + 1.8);
      tone(1400, 1.6, 'sine', 0.05, 200); tone(60, 1.7, 'sine', 0.12, 40); noise(1.6, 0.05, 180);
    },
    cluster: function () { [[1900, 0], [1500, 0.16], [1700, 0.32]].forEach(function (w) { tone(w[0], 0.85, 'sine', 0.065, 200, w[1]); noise(0.04, 0.05, 4000, w[1], 'highpass'); }); },
    overheat: function () { noise(0.75, 0.13, 3500, 0, 'highpass'); tone(320, 0.4, 'square', 0.035, 110); },
    ready: function () { tone(1250, 0.05, 'triangle', 0.06); tone(1650, 0.07, 'triangle', 0.06, null, 0.06); },
    pizza: function () { tone(660,0.12,'triangle',0.18); tone(880,0.12,'triangle',0.18,null,0.14); tone(1320,0.24,'triangle',0.18,null,0.28); },
    sniper: function () { noise(0.06, 0.16, 3200); tone(900, 0.08, 'triangle', 0.08, 250); },
    // Wave start: a short bugle call. Wave clear keeps the bright arpeggio.
    bugle: function () { brass(392, 0.14, 0.07); brass(523, 0.14, 0.07, 0.14); brass(659, 0.14, 0.07, 0.28); brass(784, 0.5, 0.08, 0.42); },
    wave: function () { tone(523, 0.12, 'triangle', 0.15); tone(659, 0.12, 'triangle', 0.15, null, 0.12); tone(784, 0.22, 'triangle', 0.15, null, 0.24); },
    // A wave that never touched the wall: the same arpeggio, then two higher notes on top.
    untouched: function () { SFX.wave(); tone(1047, 0.1, 'triangle', 0.11, null, 0.42); tone(1319, 0.3, 'triangle', 0.11, null, 0.52); },
    // The shop opening: a page turning, then two quiet low brass notes, like a band settling ("at ease"). It was a
    // second bright arpeggio straight after the wave-clear one.
    shop: function () {
      noise(0.35, 0.05, 1800, 0, 'bandpass'); noise(0.25, 0.035, 4200, 0.12, 'highpass');
      soft(98, 0.5, 0.045, 0.35); soft(130.8, 1.1, 0.045, 0.8); soft(164.8, 1.1, 0.025, 0.8);
    },
    // Buying in the shop: a soldier keeps the recruit ding; a supply is a pen scratch and a clunk; a radio call a click
    // of static and two beeps; putting something back is the ding, backwards.
    // Menu buttons: a pen tap for a chip, a firmer double tap for a big button.
    click: function () { tone(1250, 0.035, 'triangle', 0.18, 900); noise(0.025, 0.1, 3800, 0, 'bandpass'); },
    press: function () { tone(520, 0.05, 'triangle', 0.16, 330); noise(0.03, 0.08, 2400, 0, 'bandpass'); tone(980, 0.04, 'triangle', 0.08, 700, 0.05); },
    gear: function () { noise(0.05, 0.05, 5200, 0, 'highpass'); noise(0.05, 0.05, 5200, 0.07, 'highpass'); tone(210, 0.09, 'triangle', 0.2, 140, 0.13); noise(0.04, 0.12, 1200, 0.13, 'bandpass'); tone(1320, 0.06, 'triangle', 0.05, null, 0.2); },
    call: function () { noise(0.1, 0.18, 2600, 0, 'bandpass'); tone(1400, 0.06, 'square', 0.07, null, 0.11); tone(1870, 0.08, 'square', 0.06, null, 0.19); },
    back: function () { tone(990, 0.08, 'triangle', 0.13); tone(660, 0.14, 'triangle', 0.13, null, 0.08); },
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
    // The Dreadnought: a deep rumble as it shows through the page, a hissing flare on each target, the heavy gun, and
    // a klaxon when the bridge is exposed. Beating it plays a fanfare.
    rumble: function () { noise(2.6, 0.22, 150); tone(42, 2.6, 'sine', 0.22, 31); },
    flare: function () { noise(0.7, 0.07, 4200, 0, 'highpass'); tone(900, 0.45, 'sine', 0.025, 1500); },
    broadside: function () { noise(0.7, 0.5, 280); tone(56, 0.7, 'sine', 0.38, 28); noise(0.1, 0.25, 2200); },
    klaxon: function () { honk(0); honk(0.78); honk(1.56); honk(2.34); },
    // The Dreadnought's entrance: a low minor brass chord swelling under its horn.
    sting: function () { [73.4, 87.3, 110, 146.8].forEach(function (f, i) { brass(f, 2.2, 0.075, i * 0.03); }); noise(1.8, 0.05, 160); },
    // Its main gun charging: a whine rising over three seconds under a warning beep that quickens; then the shot, the
    // biggest bang in the game.
    charge: function () {
      tone(110, 3, 'sawtooth', 0.04, 880); tone(220, 3, 'square', 0.016, 1760);
      [0, 0.7, 1.3, 1.8, 2.2, 2.5, 2.7, 2.85].forEach(function (t) { tone(1320, 0.08, 'square', 0.05, null, t); });
    },
    maingun: function () { noise(0.6, 0.6, 240); noise(0.6, 0.35, 180, 0.4); tone(48, 1, 'sine', 0.45, 22); noise(0.14, 0.32, 2400); tone(140, 0.5, 'sawtooth', 0.08, 40); },
    // Its wreck hitting the ground: a long, deep crash with metal crumpling through it.
    crash: function () {
      noise(0.6, 0.6, 260); noise(0.6, 0.45, 200, 0.45); noise(0.6, 0.3, 160, 0.9); noise(0.6, 0.18, 140, 1.35);
      tone(55, 1.8, 'sine', 0.45, 22); tone(170, 0.9, 'sawtooth', 0.07, 45, 0.05);
      for (var i = 0; i < 7; i++) noise(0.14, 0.2, 2600 - i * 260, 0.04 + i * 0.1, 'bandpass');
    },
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
      f.connect(g); g.connect(fx);
    },
    // The Red Cross plane coming in: a soft two-tone chime. HQ's supply plane: an engine and a bright little horn.
    medevac: function () { tone(988, 0.22, 'sine', 0.09); tone(784, 0.3, 'sine', 0.09, null, 0.24); tone(988, 0.22, 'sine', 0.07, null, 0.6); tone(784, 0.3, 'sine', 0.07, null, 0.84); },
    // It got across: the same soft chime, rising this time and coming to rest, "all clear".
    safe: function () { tone(784, 0.18, 'sine', 0.09); tone(988, 0.18, 'sine', 0.09, null, 0.18); tone(1175, 0.5, 'sine', 0.08, null, 0.36); tone(1568, 0.5, 'sine', 0.03, null, 0.36); },
    hq: function () { tone(90, 1.1, 'sawtooth', 0.035, 150); brass(659, 0.12, 0.06, 0.2); brass(880, 0.25, 0.065, 0.34); },
    // A heavy bomber: a deep, beating drone of four engines.
    drone: function () { tone(52, 2.4, 'sawtooth', 0.045, 58); tone(55.5, 2.4, 'sawtooth', 0.04, 61); noise(2, 0.07, 220); },
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
  // Gibberish chatter to go with the game's speech bubbles: a syllable for each vowel in the line (up to four), each a
  // buzzy pitch through the formants of that vowel, so "medic!" and "air strike!" sound like themselves. Every speaker
  // keeps his own pitch (from his id); the enemy's voices are lower and gruffer. (The browser's own speech was tried and
  // sounded bad on phones.) Each line has a mood (MOODS):
  // - alarm ("medic!", "incoming!"): said twice, quick, high and falling, and always heard at once;
  // - radio (the radio calls): flat, through a walkie-talkie, with a click and static before and a squelch beep after;
  // - chat (small talk): soft, slow and round, a question going up at the end; it gives way to anything else;
  // - anything else: as before, a line ending in "!" lifting at the end.
  // Lines don't talk over each other: one that would overlap a line already playing waits until it ends (up to
  // SAY.WAIT), except an alarm, which plays at once, and small talk, which is dropped. (Before, any line within 0.2 s of
  // another was dropped, alarms included.)
  var SAY = { VOL: 0.12, WAIT: 0.6, SPACE: 0.04 }, saying = [];
  // Formants per vowel, and a level for each so they come out about equally loud.
  var VOWELS = { a: [730, 1090, 0.65], e: [530, 1840, 0.85], i: [300, 2200, 1.2], o: [570, 840, 1], u: [320, 900, 1.2], y: [300, 2200, 1.2] };
  // vol: loudness; len: syllable length; gap: between syllables; glide: pitch at a syllable's end; wave: oscillator;
  // shape(i, n, lift, ask): pitch of syllable i of n.
  var MOODS = {
    alarm: { vol: 2.1, len: 0.7, gap: 0.015, glide: 0.75, wave: 'sawtooth', twice: true, shape: function (i) { return 1.45 * Math.pow(0.82, i); } },
    radio: { vol: 1.6, len: 0.9, gap: 0.03, glide: 1, shape: function () { return 1; } },
    chat: { vol: 0.6, len: 1.5, gap: 0.07, glide: 0.98, wave: 'triangle', shape: function (i, n, lift, ask) { return i === n - 1 ? (ask ? 1.4 : 0.8) : 1 - i * 0.02; } },
    plain: { vol: 1, len: 1, gap: 0.035, glide: 0.93, shape: function (i, n, lift) { return lift && i === n - 1 ? 1.3 : 1; } }
  };
  function say(text, voice, enemy, delay, mood) {
    if (!AC || muted) return;
    var now = AC.currentTime, t = now + (delay || 0), M = enemy ? MOODS.plain : MOODS[mood] || MOODS.plain;
    var h = Math.imul((voice | 0) + 7, 2654435761) >>> 0, base = enemy ? 118 + (h % 5) * 11 : 220 + (h % 7) * 22;
    var vowels = (String(text).toLowerCase().match(/[aeiouy]/g) || ['a']).slice(0, 4), lift = /!$/.test(text), ask = /\?$/.test(text), n = vowels.length;
    var lens = vowels.map(function (v, i) { return (0.07 + ((h >>> (i * 3)) & 3) * 0.012) * M.len; });
    var once = lens.reduce(function (a, d) { return a + d + M.gap; }, 0), len = (M.twice ? 2 * once + 0.06 : once) + (mood === 'radio' ? 0.2 : 0);
    saying = saying.filter(function (q) { return q.end > now; });
    if (mood !== 'alarm') {
      var clash = saying.filter(function (q) { return q.start < t + len && q.end + SAY.SPACE > t; });
      if (clash.length) {
        if (mood === 'chat') return;
        var after = Math.max.apply(null, clash.map(function (q) { return q.end; })) + SAY.SPACE;
        if (after - t > SAY.WAIT) return;
        t = after;
      }
    }
    saying.push({ start: t, end: t + len });
    try {
      var out = null;
      if (mood === 'radio' && !enemy) {
        tone(2400, 0.02, 'square', 0.06, null, t - now); noise(0.09, 0.09, 2600, t - now, 'bandpass'); t += 0.1;
        var band = AC.createBiquadFilter(), crush = AC.createWaveShaper(), cv = new Float32Array(257);
        for (var k = 0; k < 257; k++) cv[k] = Math.tanh(4 * (k / 128 - 1));
        band.type = 'bandpass'; band.frequency.value = 1400; band.Q.value = 2.2; crush.curve = cv; band.connect(crush); crush.connect(fx); out = band;
        noise(once, 0.025, 3000, t - now, 'bandpass'); tone(1750, 0.07, 'square', 0.045, null, t + once + 0.03 - now);
      }
      for (var r = 0; r < (M.twice ? 2 : 1); r++) {
        vowels.forEach(function (v, i) {
          var f = base * (1 + ((h >>> (i * 2 + 9)) & 3) * 0.07) * M.shape(i, n, lift, ask) * (r ? 1.08 : 1);
          syllable(t, f, lens[i], VOWELS[v], enemy, M, out);
          t += lens[i] + M.gap;
        });
        t += 0.06;
      }
    } catch (e) { /* ignore */ }
  }
  function syllable(t, f, d, formants, enemy, M, out) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = enemy ? 'sawtooth' : M.wave || 'square';
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (enemy ? 0.85 : M.glide), t + d);
    var vol = SAY.VOL * formants[2] * (enemy ? 1.6 : M.vol);
    formants.slice(0, 2).forEach(function (F, i) {
      var bp = AC.createBiquadFilter(), lvl = AC.createGain();
      bp.type = 'bandpass'; bp.frequency.value = F; bp.Q.value = 4; lvl.gain.value = i ? 0.6 : 1;
      o.connect(bp); bp.connect(lvl); lvl.connect(g);
    });
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.setValueAtTime(vol, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    g.connect(out || fx); o.start(t); o.stop(t + d + 0.02);
  }

  // The menus' own sounds go straight to master, so they're heard on the title, where fx is closed.
  var UI = { click: true, press: true };
  function sfx(name) {
    if (!AC || muted) return;
    var now = performance.now();
    if (lastPlay[name] && now - lastPlay[name] < 45) return;
    lastPlay[name] = now;
    route = UI[name] ? master : fx;
    try { SFX[name](); } catch (e) { /* ignore */ }
    route = fx;
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
  // The low-wall heartbeat: a deep lub-dub, with a soft knock higher up on each beat (knock), since a phone's
  // speaker plays almost nothing under 100 Hz.
  function heart(t) { drum(t, 62, 52, 0.14, 0.2); knock(t, 0.17); drum(t + 0.22, 54, 46, 0.16, 0.15); knock(t + 0.22, 0.12); }
  function knock(t, vol) {
    var o = AC.createOscillator(), g = AC.createGain(), s = AC.createBufferSource(), f = AC.createBiquadFilter(), ng = AC.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.06);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g); g.connect(amb.drums); o.start(t); o.stop(t + 0.11);
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
    ng.gain.setValueAtTime(vol * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    s.connect(f); f.connect(ng); ng.connect(amb.drums); s.start(t, Math.random() * 2); s.stop(t + 0.05);
  }
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
  // thin: the final wave's teaser, just the low brass and the timpani, quietly.
  function dreadStep(i, bar, t, dt, bridge, thin) {
    DREAD_BASS[bar % 2].forEach(function (n) { if (n[0] === i) brassAt(t, n[1], n[2] * dt * 0.95, thin ? 0.03 : 0.05); });
    if (thin) { if (i === 0) timp(t, D2, 0.16); return; }
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
  // When the page is quiet (heat 0, from the game) it drops to a bass drum and a soft tap. It used to get busier too
  // when the page was busy (rolls every bar, a doubled bass drum, low brass, a faster tempo); with that much going on
  // in the fight, the march stays simple instead.
  function marchStep(i, bar, wave, t, dt, low, boss, heat) {
    if (heat === 0) {
      if (low) { if (i === 0 || i === 8) heart(t); }
      else if (i === 0) drum(t, 110, 44, 0.3, 0.13); else if (i === 8) drum(t, 100, 44, 0.3, 0.08);
      if (i === 12) snare(t, 0.035);
      if (boss && i === 0) drum(t, 82, 58, 0.7, 0.16);
      return;
    }
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

  // state: { active, title (the title is showing: its music, and no effects), planes: [{ x, dir, kind }], wave (true
  //   while a wave is running), number (the wave), wallLow, heat (0 quiet, 1, 2 busy), dread (the Dreadnought's
  //   phase, or null) }
  function ambience(state) {
    if (!AC) return;
    ambInit();
    if (!amb) return;
    var now = AC.currentTime, title = !muted && !!state.title, on = !muted && !!state.active;
    amb.bus.gain.setTargetAtTime(on || title ? 1 : 0, now, on || title ? 0.6 : 0.2);
    // Leaving the title opens fx at once, so the wave's first bugle isn't swallowed.
    if (state.title) fx.gain.setTargetAtTime(0, now, 0.05);
    else if (amb.wasTitle) { fx.gain.cancelScheduledValues(now); fx.gain.setValueAtTime(1, now); }
    amb.wasTitle = !!state.title;
    if (title) titleMusic(now); else amb.title = null;
    var planes = (state.planes || []).slice().sort(function (a, b) { return Math.abs(a.x - 200) - Math.abs(b.x - 200); });
    amb.voices.forEach(function (v, i) {
      var p = planes[i];
      if (!on || !p || state.title) { v.g.gain.setTargetAtTime(0, now, 0.25); return; }
      // Slightly higher pitch while approaching the middle, lower while leaving.
      var zep = p.kind === 'zeppelin' || p.kind === 'dread' || p.kind === 'heli', base = p.kind === 'dread' ? 34 : p.kind === 'heli' ? 38 : zep ? 44 : p.kind === 'cargo' ? 50 : p.kind === 'bomber' ? 56 : p.kind === 'diver' ? 96 : p.kind === 'heavy' ? 48 : 80, doppler = (200 - p.x) * p.dir > 0 ? 1.04 : 0.96;
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
      // The final wave opens with it thin (teaser) and goes quiet (hush) before the real one arrives. Going down, the
      // music stops (it used to drop back into the wave's own march) and the crash carries it to the end of the wave.
      var down = state.dread === 'sinking' || state.dread === 'wreck';
      var dreadOn = !!state.dread && !down, bridge = state.dread === 'hangar' || state.dread === 'bridge';
      var thin = state.dread === 'teaser', hush = state.dread === 'hush' || down;
      var heat = state.heat == null ? 1 : state.heat;
      var n = state.number || 1, bpm = dreadOn ? (bridge ? 104 : 96) : Math.min(124, 106 + Math.max(0, n - 3) * 1.5), dt = 60 / bpm / 4;
      var boss = planes.some(function (p) { return p.kind === 'zeppelin'; });
      while (amb.nextStep < now + 0.3) {
        if (hush) { /* a held breath */ }
        else if (dreadOn) dreadStep(amb.step, amb.bar, amb.nextStep, dt, bridge, thin);
        else marchStep(amb.step, amb.bar, n, amb.nextStep, dt, !!state.wallLow, boss, heat);
        amb.nextStep += dt;
        if (++amb.step === 16) { amb.step = 0; amb.bar++; }
      }
    } else {
      amb.marching = false;
      if (on && state.wallLow && now >= amb.nextBeat) { heart(now); amb.nextBeat = now + 0.95; }
    }
  }

  // ---------- title music ----------
  // A short bugle march on the title, original to the game and built on the four notes of the wave-start bugle call
  // (G C E G), so the title, the wave start and the victory fanfare sound like one army. Eight bars at 116 BPM that
  // build in layers as they loop: first the bugle and a snare; then oom-pah low brass and a bass drum; then a second
  // bugle a third below, rolls and a glockenspiel on top; then back to the second layer and up again.
  var G3 = 196, C4 = 261.63, E4 = 329.63, G4 = 392, C5 = 523.25, E5 = 659.25, G5 = 783.99;
  // [beat, Hz, beats]
  var TUNE = [
    [[0, G3, .5], [.5, C4, .5], [1, E4, .5], [1.5, G4, 1.5], [3, E4, .5], [3.5, G4, .5]],
    [[0, C5, 1], [1, G4, .5], [1.5, E4, .5], [2, G4, 1.5]],
    [[0, E4, .5], [.5, G4, .5], [1, E4, .5], [1.5, C4, .5], [2, G3, 1.5], [3.5, G3, .5]],
    [[0, C4, .5], [.5, E4, .5], [1, G4, 1], [2, C4, 1.5]],
    [[0, G3, .5], [.5, C4, .5], [1, E4, .5], [1.5, G4, 1.5], [3, E4, .5], [3.5, G4, .5]],
    [[0, C5, .5], [.5, E5, .5], [1, G5, 1], [2, E5, .5], [2.5, C5, .5], [3, G4, 1]],
    [[0, E5, .75], [.75, C5, .25], [1, G4, .5], [1.5, E4, .5], [2, G4, .5], [2.5, E4, .5], [3, G3, 1]],
    [[0, C4, .5], [.5, G3, .25], [.75, C4, .25], [1, E4, .5], [1.5, G4, .5], [2, C5, 1.5]]
  ];
  // Each bar's chord: [root, fifth, [the chord]] for C and G.
  var CHORDS = { C: [65.41, 98, [130.81, 164.81, 196]], G: [49, 73.42, [123.47, 146.83, 196]] }, BARS = 'CCGCCCGC';
  var THIRD = {}; THIRD[G3] = 164.81; THIRD[C4] = 220; THIRD[E4] = 261.63; THIRD[G4] = 329.63; THIRD[C5] = 440; THIRD[E5] = 523.25; THIRD[G5] = 659.25;
  var TITLE = { BPM: 116 };
  function titleMusic(now) {
    var beat = 60 / TITLE.BPM;
    if (!amb.title || amb.title.next < now) amb.title = { next: now + 0.15, bar: 0 };
    while (amb.title.next < now + 0.4) { titleBar(amb.title.bar, amb.title.next, beat); amb.title.next += beat * 4; amb.title.bar++; }
  }
  function titleBar(bar, t, beat) {
    var pass = Math.floor(bar / 8), layer = pass === 0 ? 1 : pass % 2 ? 2 : 3, ch = CHORDS[BARS[bar % 8]];
    TUNE[bar % 8].forEach(function (n) {
      var at = t + n[0] * beat, d = n[2] * beat;
      bugleAt(at, n[1], d * 0.92, 0.07);
      if (layer === 3) { bugleAt(at, THIRD[n[1]], d * 0.9, 0.04); if (n[2] >= 1) glockAt(at, n[1] * 4, 0.035); }
    });
    for (var b = 0; b < 4; b++) {
      var at = t + b * beat;
      if (layer >= 2) {
        if (b % 2 === 0) brassAt(at, b ? ch[1] : ch[0], beat * 0.8, 0.05);
        else ch[2].forEach(function (f) { brassAt(at, f, beat * 0.35, 0.014); });
        if (b === 0 || b === 2) drum(at, 120, 44, 0.3, 0.13);
      }
      if (b === 1 || b === 3) snare(at, layer === 1 ? 0.06 : 0.08);
      if (layer === 3 && b % 2 === 1) snare(at + beat / 2, 0.03);
      if ((layer === 3 ? bar % 2 === 1 : bar % 4 === 3) && b === 3) for (var k = 0; k < 4; k++) snare(at + k * beat / 4, 0.03 + k * 0.015);
    }
  }
  // The bugle's voice on the music bus: a sawtooth through a lowpass that opens as it sounds, with a quick swell.
  function bugleAt(t, f, dur, vol) {
    var o = AC.createOscillator(), fl = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t); fl.frequency.linearRampToValueAtTime(1800, t + 0.05);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(amb.drums); o.start(t); o.stop(t + dur + 0.03);
  }
  function glockAt(t, f, vol) {
    [[1, 1, 0.6], [2.76, 0.35, 0.12], [5.4, 0.12, 0.05]].forEach(function (h) {
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.value = f * h[0];
      g.gain.setValueAtTime(vol * h[1], t); g.gain.exponentialRampToValueAtTime(0.0001, t + h[2]);
      o.connect(g); g.connect(amb.drums); o.start(t); o.stop(t + h[2] + 0.02);
    });
  }

  return {
    init: audioInit,
    play: sfx,
    say: say,
    ambience: ambience,
    get muted() { return muted; },
    // Muting fades the whole mix out in a few hundredths of a second, so a long sound already playing (a klaxon, the
    // wreck's crash) stops too; unmuting brings it back.
    set muted(value) {
      muted = !!value;
      if (master) master.gain.setTargetAtTime(muted ? 0 : LEVEL, AC.currentTime, 0.015);
    }
  };
})();
