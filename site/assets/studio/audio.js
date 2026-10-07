// Homepage sound: procedural Web Audio, no files. Classic script; load before ident.js. Storage stays with the page.
// Kept sparse on purpose: a quiet note per card, a rising tone while the rainbow charges, and a few payoffs.
// Browsers only let audio start after a click, tap or key press, so `ready` stays false until then and
// `onready` is called whenever that changes (the page uses it to keep the Sound button honest).
var StudioSound = (function () {
  'use strict';

  var GAIN = 0.3;
  var AC = null, master = null, noiseBuf = null, muted = false, lastPlay = {}, charger = null;
  var api;

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function notify() { if (api && api.onready) api.onready(); }

  // iPhones only start audio when a sound is started inside the tap itself, so each unlock attempt plays one silent sample.
  function warm() {
    try { var s = AC.createBufferSource(); s.buffer = AC.createBuffer(1, 1, AC.sampleRate); s.connect(AC.destination); s.start(0); } catch (e) {}
  }

  function audioInit() {
    if (AC) {
      if (AC.state !== 'running') { warm(); var p = AC.resume(); if (p && p.then) p.then(notify, function () {}); }
      return;
    }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = muted ? 0 : GAIN; master.connect(AC.destination);
      noiseBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.6), AC.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      AC.onstatechange = notify;
      warm();
      if (AC.state !== 'running') { var q = AC.resume(); if (q && q.then) q.then(notify, function () {}); }
      setTimeout(notify, 0);
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

  // One held tone follows the egg's power: G3 at zero up to C6 at full (p = 1).
  // Past full (up to 1.25, while the puddle grows) it climbs a little more and starts to wobble, like it's about to go.
  function charge(p) {
    if (!charger) {
      var o = AC.createOscillator(), g = AC.createGain(), lfo = AC.createOscillator(), depth = AC.createGain();
      o.type = 'triangle'; o.frequency.value = hz(55); g.gain.value = 0;
      lfo.frequency.value = 7; depth.gain.value = 0;
      lfo.connect(depth); depth.connect(o.frequency);
      o.connect(g); g.connect(master); o.start(); lfo.start();
      charger = { o: o, g: g, lfo: lfo, depth: depth };
    }
    var t = AC.currentTime, x = Math.max(0, Math.min(1.25, p)), f = hz(55 + x * 29), wobble = Math.max(0, (x - 1) / 0.25);
    charger.o.frequency.setTargetAtTime(f, t, 0.04);
    charger.depth.gain.setTargetAtTime(f * 0.04 * wobble, t, 0.05);
    charger.lfo.frequency.setTargetAtTime(7 + wobble * 5, t, 0.05);
    charger.g.gain.setTargetAtTime(0.04 + 0.08 * Math.min(1, x), t, 0.05);
  }
  function chargeEnd() {
    if (!charger) return;
    var c = charger, t = AC.currentTime;
    charger = null;
    c.g.gain.setTargetAtTime(0, t, 0.05);
    c.o.stop(t + 0.4); c.lfo.stop(t + 0.4);
  }

  var PENTA = [72, 76, 79, 84, 88];
  var SFX = {
    // card hover or keyboard focus; the argument is the card's position, so each card has its own note
    tick: function (i) { tone(hz(PENTA[(i || 0) % PENTA.length] + 12), 0.06, 'square', 0.05); },
    press: function () { tone(hz(79), 0.06, 'square', 0.08); tone(hz(84), 0.1, 'square', 0.08, null, 0.05); },
    // sound switched on from the footer button (or, softer, by a first tap elsewhere)
    hello: function (soft) {
      if (soft) { [79, 84].forEach(function (m, k) { tone(hz(m), 0.12, 'triangle', 0.08, null, k * 0.08); }); return; }
      [72, 79, 84].forEach(function (m, k) { tone(hz(m), 0.14, 'triangle', 0.16, null, k * 0.08); });
      tone(hz(88), 0.3, 'sine', 0.12, hz(91), 0.24);
    },
    // the egg reaches full power
    full: function () { tone(hz(88), 0.08, 'triangle', 0.15); tone(hz(95), 0.22, 'triangle', 0.12, null, 0.07); },
    // let go near full power: the stream lands, then a few drops patter down
    splash: function () {
      noise(0.4, 0.3, 2600, 0, 500);
      [96, 91, 88, 84, 79, 76].forEach(function (m, k) { tone(hz(m), 0.12, 'sine', 0.1, null, 0.03 + k * 0.045); });
      for (var k = 0; k < 6; k++) {
        var m = PENTA[(Math.random() * PENTA.length) | 0] + 12;
        tone(hz(m), 0.05, 'sine', 0.05 + Math.random() * 0.04, hz(m - 5), 0.35 + k * 0.08 + Math.random() * 0.06);
      }
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

  api = {
    init: audioInit,
    play: play,
    onready: null,
    get ready() { return !!AC && AC.state === 'running'; },
    get muted() { return muted; },
    set muted(value) {
      muted = !!value;
      if (master) master.gain.setTargetAtTime(muted ? 0 : GAIN, AC.currentTime, 0.02);
    }
  };
  return api;
})();
