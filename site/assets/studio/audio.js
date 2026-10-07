// Homepage sound: procedural Web Audio, no files. Classic script; load before ident.js. Storage stays with the page.
// Kept sparse on purpose: a quiet note per card, a rising tone while the rainbow charges, and a few payoffs.
var StudioSound = (function () {
  'use strict';

  var GAIN = 0.3;
  var AC = null, master = null, noiseBuf = null, muted = false, lastPlay = {}, charger = null;

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function audioInit() {
    if (AC) {
      if (AC.state === 'suspended') { var p = AC.resume(); if (p && p.catch) p.catch(function () {}); }
      return;
    }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = muted ? 0 : GAIN; master.connect(AC.destination);
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

  function noise(dur, vol, freq, delay, f2) {
    var t0 = AC.currentTime + (delay || 0), s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t0);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + 0.03);
  }

  // One held tone follows the egg's power: G3 at zero up to C6 at full, a little higher while the puddle grows.
  function charge(p) {
    if (!charger) {
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = 'triangle'; o.frequency.value = hz(55); g.gain.value = 0;
      o.connect(g); g.connect(master); o.start();
      charger = { o: o, g: g };
    }
    var t = AC.currentTime, x = Math.max(0, Math.min(1.25, p));
    charger.o.frequency.setTargetAtTime(hz(55 + x * 29), t, 0.04);
    charger.g.gain.setTargetAtTime(0.04 + 0.08 * Math.min(1, x), t, 0.05);
  }
  function chargeEnd() {
    if (!charger) return;
    var c = charger, t = AC.currentTime;
    charger = null;
    c.g.gain.setTargetAtTime(0, t, 0.05);
    c.o.stop(t + 0.4);
  }

  var PENTA = [72, 76, 79, 84, 88];
  var SFX = {
    // card hover or focus; the argument is the card's position, so each card has its own note
    tick: function (i) { tone(hz(PENTA[(i || 0) % PENTA.length] + 12), 0.06, 'square', 0.05); },
    press: function () { tone(hz(79), 0.06, 'square', 0.08); tone(hz(84), 0.1, 'square', 0.08, null, 0.05); },
    // the egg reaches full power
    full: function () { tone(hz(88), 0.08, 'triangle', 0.15); tone(hz(95), 0.22, 'triangle', 0.12, null, 0.07); },
    // let go near full power: the stream lands
    splash: function () {
      noise(0.4, 0.3, 2600, 0, 500);
      [96, 91, 88, 84, 79, 76].forEach(function (m, k) { tone(hz(m), 0.12, 'sine', 0.1, null, 0.03 + k * 0.045); });
    },
    // the shelf flips to Side B, and back to Games
    sideB: function () {
      [72, 76, 79, 84, 88, 91].forEach(function (m, k) { tone(hz(m), 0.16, 'triangle', 0.16, null, k * 0.07); });
      tone(hz(96), 0.6, 'sine', 0.12, null, 0.45);
    },
    sideA: function () { noise(0.2, 0.15, 1800, 0, 300); tone(hz(76), 0.18, 'triangle', 0.14, hz(64)); }
  };

  function play(name, arg) {
    if (!AC) return;
    if (name === 'chargeEnd') { chargeEnd(); return; }   // always stops, even if just muted
    if (muted) return;
    if (name === 'charge') { charge(arg || 0); return; }
    var now = performance.now();
    if (lastPlay[name] && now - lastPlay[name] < 45) return;
    lastPlay[name] = now;
    try { if (SFX[name]) SFX[name](arg); } catch (e) { /* ignore */ }
  }

  return {
    init: audioInit,
    play: play,
    get muted() { return muted; },
    set muted(value) {
      muted = !!value;
      if (master) master.gain.setTargetAtTime(muted ? 0 : GAIN, AC.currentTime, 0.02);
    }
  };
})();
