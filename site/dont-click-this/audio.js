// Don't click this: a few synthesized blips, no audio files. Browsers only allow audio after a tap,
// so init() is called from the first one. API: init(), play(name), toggle(), muted.
window.DontClickSound = (function () {
  const KEY = 'dont-click-this-muted';
  let ctx = null, master;
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

  function init() {
    if (ctx) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    // iPhones only start audio when a sound is started inside the tap itself.
    try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); s.connect(ctx.destination); s.start(0); } catch (e) {}
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
  }

  function tone(freq, at, len, type, vol, slide) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + len + 0.02);
  }
  function noise(at, len, vol) {
    const t = ctx.currentTime + at, n = Math.floor(ctx.sampleRate * len), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(200, t + len);
    s.buffer = buf; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }

  const SOUNDS = {
    // someone arrived: a rising arpeggio
    join() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.18, 'square', 0.12)); },
    leave() { tone(523, 0, 0.15, 'square', 0.1); tone(392, 0.12, 0.25, 'square', 0.1); },
    // the dots touched
    boom(big) {
      noise(0, big ? 0.9 : 0.4, big ? 0.5 : 0.3);
      tone(110, 0, 0.5, 'sawtooth', 0.2, 40);
      const chord = big ? [523, 659, 784, 1047, 1319] : [784, 988, 1175];
      chord.forEach((f, i) => tone(f, 0.05 + i * 0.05, big ? 0.9 : 0.4, 'triangle', 0.12));
    },
    tap() { tone(880, 0, 0.05, 'square', 0.05); }
  };

  const api = {
    init,
    play(name, arg) { if (!ctx || muted) return; try { SOUNDS[name](arg); } catch (e) {} },
    toggle() {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() { return muted; }
  };
  return api;
})();
