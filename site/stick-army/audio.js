// Procedural sound. Classic script; load before game.js. Storage stays in the game.
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
  function noise(dur, vol, freq, delay) {
    var t0 = AC.currentTime + (delay || 0), s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + 0.03);
  }
  var SFX = {
    shoot: function () { noise(0.05, 0.08, 3000); tone(260, 0.05, 'square', 0.025, 120); },
    ally: function () { noise(0.04, 0.05, 2200); },
    rocket: function () { noise(0.25, 0.1, 900); },
    pop: function () { tone(880, 0.09, 'triangle', 0.16, 320); },
    boing: function () { tone(140, 0.16, 'sine', 0.32, 520); tone(520, 0.22, 'sine', 0.2, 260, 0.15); },
    splat: function () { noise(0.2, 0.32, 650); },
    hit: function () { noise(0.07, 0.18, 1600); tone(320, 0.06, 'square', 0.05, 160); },
    boom: function () { noise(0.55, 0.45, 420); tone(90, 0.4, 'sine', 0.3, 40); },
    clank: function () { tone(1300, 0.06, 'square', 0.06, 900); },
    recruit: function () { tone(660, 0.1, 'triangle', 0.18); tone(990, 0.18, 'triangle', 0.18, null, 0.09); },
    noo: function () { tone(420, 0.3, 'sawtooth', 0.06, 180); },
    thud: function () { tone(110, 0.08, 'sine', 0.15, 70); },
    thump: function () { noise(0.06, 0.12, 400); },
    tink: function () { tone(1800, 0.04, 'triangle', 0.04); },
    whistle: function () { tone(1500, 0.9, 'sine', 0.07, 180); },
    pizza: function () { tone(660,0.12,'triangle',0.18); tone(880,0.12,'triangle',0.18,null,0.14); tone(1320,0.24,'triangle',0.18,null,0.28); },
    sniper: function () { noise(0.06, 0.16, 3200); tone(900, 0.08, 'triangle', 0.08, 250); },
    wave: function () { tone(523, 0.12, 'triangle', 0.15); tone(659, 0.12, 'triangle', 0.15, null, 0.12); tone(784, 0.22, 'triangle', 0.15, null, 0.24); },
    over: function () { tone(392, 0.2, 'triangle', 0.15); tone(330, 0.2, 'triangle', 0.15, null, 0.2); tone(262, 0.45, 'triangle', 0.15, null, 0.4); }
  };
  function sfx(name) {
    if (!AC || muted) return;
    var now = performance.now();
    if (lastPlay[name] && now - lastPlay[name] < 45) return;
    lastPlay[name] = now;
    try { SFX[name](); } catch (e) { /* ignore */ }
  }

  return {
    init: audioInit,
    play: sfx,
    get muted() { return muted; },
    set muted(value) { muted = !!value; }
  };
})();
