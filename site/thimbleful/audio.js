// Thimbleful sound: everything is synthesized with Web Audio, no audio files.
// Music is a cozy 4-bar loop (C, Am, F, G) that speeds up as the game gets harder. Once the storm is in it
// turns minor (Cm, Ab, Fm, G), and later picks up a gritty bass and drums. Changes land at the top of the loop.
// Browsers only allow audio after a click, tap or key press: `ready` is false until then, and `onready` is
// called whenever that changes so the Sound button can show what's really happening.
window.ThimbleSound = (function () {
  const KEY = 'thimbleful-muted';
  let ctx = null, master, musicBus, sfxBus, noiseBuf;
  let muted = false, playing = false, timer = null, nextT = 0, step = 0, bpm = 108, combo = 0;
  let edge = 0, minor = false, gritty = false, bar = 0;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // 32 eighth-note steps, MIDI notes, null = rest
  const MELODY = [72, null, 76, 79, 76, null, 74, 72,  69, null, 72, 76, 74, null, 72, null,
                  65, null, 69, 72, 74, 72, 69, null,  67, null, 71, 74, 72, null, 74, null];
  const ROOTS = [48, 45, 41, 43], ROOTS_MINOR = [48, 44, 41, 43];
  const THIRDS = [4, 3, 4, 4], THIRDS_MINOR = [3, 4, 3, 4];
  // the chord under each bar, for catch sounds that follow the music
  const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  const CHORDS_MINOR = [[60, 63, 67], [56, 60, 63], [53, 56, 60], [55, 59, 62]];
  // E -> Eb and A -> Ab in minor; B stays as the leading tone over G
  const inKey = m => { if (!minor) return m; const pc = m % 12; return pc === 4 || pc === 9 ? m - 1 : m; };

  const notify = () => { if (api.onready) api.onready(); };
  // iPhones only start audio when a sound is started inside the tap itself, so each unlock attempt plays one silent sample.
  function warm() {
    try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); s.connect(ctx.destination); s.start(0); } catch (e) {}
  }
  function wake() { warm(); const p = ctx.resume(); if (p && p.then) p.then(notify, () => {}); }

  function init() {
    if (ctx) { if (ctx.state !== 'running') wake(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    ctx.onstatechange = notify;
    if (ctx.state !== 'running') wake(); else warm();
    setTimeout(notify, 0);
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
    s.buffer = noiseBuf; s.loop = true;
    f.type = type; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t); s.stop(t + dur + 0.02);
  }

  function scheduleStep(t) {
    if (step % 32 === 0) { minor = edge > 0.25; gritty = edge > 0.6; }
    bar = Math.floor(step / 8) % 4;
    const beat = step % 8, len = 60 / bpm / 2, root = (minor ? ROOTS_MINOR : ROOTS)[bar];
    const m = MELODY[step % 32];
    if (m) tone(hz(inKey(m)), t, len * 1.6, 'triangle', 0.5, musicBus);
    if (beat === 0) tone(hz(root), t, len * 3.2, gritty ? 'sawtooth' : 'square', gritty ? 0.12 : 0.16, musicBus);
    if (beat === 4) tone(hz(root + 7), t, len * 3.2, gritty ? 'sawtooth' : 'square', gritty ? 0.1 : 0.13, musicBus);
    if (beat === 2 || beat === 6) tone(hz(root + 12 + (minor ? THIRDS_MINOR : THIRDS)[bar]), t, len * 1.2, 'sine', 0.18, musicBus);
    if (beat % 2 === 1) noise(t, 0.04, 0.12, 7000, 5000, 'highpass', musicBus);
    if (gritty) {
      if (beat === 0 || beat === 4 || beat === 7) tone(140, t, 0.16, 'sine', 0.55, musicBus, 42);   // kick
      if (beat === 2 || beat === 6) noise(t, 0.11, 0.3, 2600, 900, 'bandpass', musicBus);         // snare
      if (beat % 2 === 1) tone(hz(root - 12), t, len * 0.6, 'sawtooth', 0.08, musicBus);           // pumping low bass
    }
    step++;
  }

  function scheduler() {
    while (nextT < ctx.currentTime + 0.12) { scheduleStep(nextT); nextT += 60 / bpm / 2; }
  }

  function startMusic() {
    if (!init()) return;
    playing = true; step = 0; bpm = 108; combo = 0; edge = 0; minor = false; gritty = false;
    nextT = ctx.currentTime + 0.35;
    clearInterval(timer); timer = setInterval(scheduler, 25);
  }
  function stopMusic() { playing = false; clearInterval(timer); timer = null; }

  const api = {
    init,
    onready: null,
    get ready() { return !!ctx && ctx.state === 'running'; },
    get muted() { return muted; },
    // Title screen: the opening of the game's melody over a soft C chord, as a hello.
    title() {
      if (!ctx || playing) return;
      const t = ctx.currentTime + 0.03, beat = 60 / 108 / 2;
      [72, null, 76, 79, 76, null, 74, 72].forEach((m, i) => { if (m) tone(hz(m), t + i * beat, beat * 1.6, 'triangle', 0.32, sfxBus); });
      tone(hz(48), t, beat * 6, 'square', 0.1, sfxBus);
      tone(hz(64), t + beat * 2, beat * 1.2, 'sine', 0.12, sfxBus);
      tone(hz(84), t + beat * 8, 0.5, 'sine', 0.18, sfxBus, hz(86));
    },
    // Card buttons: a quiet note on hover or keyboard focus (each button its own pitch), and a soft press.
    blip(i = 0) {
      if (!ctx) return;
      tone(hz([84, 88, 91, 96][i % 4]), ctx.currentTime, 0.05, 'triangle', 0.18, sfxBus);
    },
    press() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(hz(79), t, 0.05, 'square', 0.12, sfxBus); tone(hz(84), t + 0.03, 0.08, 'triangle', 0.2, sfxBus);
    },
    // Just watch: the music settles down and a drop plinks into the pot.
    settle() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [84, 79, 76].forEach((m, i) => tone(hz(m), t + i * 0.09, 0.2, 'sine', 0.22, sfxBus));
      tone(hz(91), t + 0.36, 0.12, 'sine', 0.3, sfxBus, hz(86));
    },
    start() {
      if (!init()) return;
      const t = ctx.currentTime + 0.02;
      [72, 76, 79, 84].forEach((m, i) => tone(hz(m), t + i * 0.07, 0.16, 'square', 0.35, sfxBus));
      startMusic();
    },
    intensity(seconds, e = 0) { edge = e; bpm = 108 + Math.min(32, seconds * 0.6) + e * 18; },
    // A catch climbs the chord that's playing, two octaves up and round again, so it moves with the music
    // (and turns minor with it). Longer runs add layers: a harmony at 6, an echo at 12, a sparkle at 20.
    catch() {
      if (!ctx) return;
      const t = ctx.currentTime, n = combo++;
      const chord = (minor ? CHORDS_MINOR : CHORDS)[bar], i = n % 6;
      const m = chord[i % 3] + 24 + (i >= 3 ? 12 : 0), top = i === 5;
      tone(hz(m), t, 0.12, 'sine', top ? 0.8 : 0.7, sfxBus, hz(m + 5));
      tone(hz(m + 12), t + 0.04, 0.1, 'triangle', 0.25, sfxBus);
      if (gritty) tone(hz(m), t, 0.08, 'square', 0.12, sfxBus);
      if (n >= 6) tone(hz(chord[(i + 1) % 3] + 24), t + 0.01, 0.14, 'triangle', 0.2, sfxBus);
      if (n >= 12) tone(hz(m + 12), t + 0.1, 0.1, 'sine', 0.18, sfxBus);
      if (n >= 20) { tone(hz(m + 19), t + 0.05, 0.06, 'square', 0.1, sfxBus); tone(hz(m + 24), t + 0.09, 0.08, 'sine', 0.15, sfxBus); }
    },
    thunder(delay = 0) {
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      noise(t, 0.18, 0.5, 2400, 400, 'lowpass', sfxBus);
      noise(t + 0.05, 1.6, 0.9, 420, 40, 'lowpass', sfxBus);
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
