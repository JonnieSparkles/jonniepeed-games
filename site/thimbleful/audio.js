// Thimbleful sound: everything is synthesized with Web Audio, no audio files.
// Music is a cozy 4-bar loop (C, Am, F, G) that speeds up as the game gets harder.
window.ThimbleSound = (function () {
  const KEY = 'thimbleful-muted';
  let ctx = null, master, musicBus, sfxBus, noiseBuf;
  let muted = false, playing = false, timer = null, nextT = 0, step = 0, bpm = 108, combo = 0;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // 32 eighth-note steps, MIDI notes, null = rest
  const MELODY = [72, null, 76, 79, 76, null, 74, 72,  69, null, 72, 76, 74, null, 72, null,
                  65, null, 69, 72, 74, 72, 69, null,  67, null, 71, 74, 72, null, 74, null];
  const ROOTS = [48, 45, 41, 43];
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.13; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.32; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function tone(freq, t, dur, type, peak, bus, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(t, dur, peak, from, to, type, bus) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t); s.stop(t + dur + 0.02);
  }

  function scheduleStep(t) {
    const bar = Math.floor(step / 8) % 4, beat = step % 8, len = 60 / bpm / 2;
    const m = MELODY[step % 32];
    if (m) tone(hz(m), t, len * 1.6, 'triangle', 0.5, musicBus);
    if (beat === 0) tone(hz(ROOTS[bar]), t, len * 3.2, 'square', 0.16, musicBus);
    if (beat === 4) tone(hz(ROOTS[bar] + 7), t, len * 3.2, 'square', 0.13, musicBus);
    if (beat === 2 || beat === 6) tone(hz(ROOTS[bar] + 12 + (bar === 1 ? 3 : 4)), t, len * 1.2, 'sine', 0.18, musicBus);
    if (beat % 2 === 1) noise(t, 0.04, 0.12, 7000, 5000, 'highpass', musicBus);
    step++;
  }

  function scheduler() {
    while (nextT < ctx.currentTime + 0.12) { scheduleStep(nextT); nextT += 60 / bpm / 2; }
  }

  function startMusic() {
    if (!init()) return;
    playing = true; step = 0; bpm = 108; combo = 0;
    nextT = ctx.currentTime + 0.35;
    clearInterval(timer); timer = setInterval(scheduler, 25);
  }
  function stopMusic() { playing = false; clearInterval(timer); timer = null; }

  const api = {
    get muted() { return muted; },
    start() {
      if (!init()) return;
      const t = ctx.currentTime + 0.02;
      [72, 76, 79, 84].forEach((m, i) => tone(hz(m), t + i * 0.07, 0.16, 'square', 0.35, sfxBus));
      startMusic();
    },
    intensity(seconds) { bpm = 108 + Math.min(32, seconds * 0.6); },
    catch() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const m = 79 + PENTA[Math.min(combo, PENTA.length - 1)];
      combo++;
      tone(hz(m), t, 0.12, 'sine', 0.7, sfxBus, hz(m + 5));
      tone(hz(m + 12), t + 0.04, 0.1, 'triangle', 0.25, sfxBus);
    },
    plant() {
      if (!ctx) return;
      const t = ctx.currentTime;
      noise(t, 0.08, 0.4, 900, 300, 'lowpass', sfxBus);
      tone(hz(67), t + 0.05, 0.12, 'sine', 0.5, sfxBus, hz(74));
    },
    earn() {
      if (!ctx) return;
      const t = ctx.currentTime + 0.05;
      [72, 79, 84, 88, 91].forEach((m, i) => tone(hz(m), t + i * 0.07, 0.22, 'triangle', 0.4, sfxBus));
      tone(hz(96), t + 0.36, 0.45, 'sine', 0.3, sfxBus);
    },
    gold() {
      if (!ctx) return;
      const t = ctx.currentTime;
      combo++;
      [84, 88, 91, 96, 100].forEach((m, i) => tone(hz(m), t + i * 0.045, 0.14, 'square', 0.32, sfxBus));
      tone(hz(108), t + 0.24, 0.3, 'sine', 0.35, sfxBus);
    },
    milestone() {
      if (!ctx) return;
      const t = ctx.currentTime + 0.12;
      [84, 88, 91, 96].forEach((m, i) => tone(hz(m), t + i * 0.06, 0.14, 'triangle', 0.3, sfxBus));
    },
    spill() {
      if (!ctx) return;
      combo = 0;
      const t = ctx.currentTime;
      noise(t, 0.22, 0.8, 1400, 180, 'lowpass', sfxBus);
      tone(150, t, 0.2, 'sine', 0.6, sfxBus, 60);
    },
    over() {
      if (!ctx) return;
      stopMusic();
      const t = ctx.currentTime + 0.05;
      [79, 76, 72, 67].forEach((m, i) => tone(hz(m), t + i * 0.16, 0.3, 'triangle', 0.45, sfxBus));
      tone(hz(43), t + 0.64, 0.6, 'square', 0.18, sfxBus);
    },
    toggle() {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
      return muted;
    },
    pause() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume() { if (ctx && playing && ctx.state === 'suspended') ctx.resume(); }
  };
  document.addEventListener('visibilitychange', () => document.hidden ? api.pause() : api.resume());
  return api;
})();
