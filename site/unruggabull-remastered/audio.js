// Unruggabull: RugCo Alley Remastered, sound.
// The 2025 game played its mp3s through <audio> elements. Phones lag and drop those, so here every file is
// decoded once into Web Audio and played from memory. Each sound is a Clip with the few things the old code
// used on an <audio> element (play, pause, currentTime, volume, loop, src, playbackRate), so the game code
// reads as it did. Pausing the game muffles everything for a moment, then suspends the whole context, so music
// and voices stop and pick up together. Browsers only allow sound after a tap or key press: init() runs on the first one.
//
// The mix: music goes through its own filter and gain (for the dips, the ducking under voice lines and the slow-downs),
// game sounds through the pause muffle, and the menu sounds straight out, so a pause blip isn't muffled. Voice lines
// are levelled (they were recorded about 23 dB apart) and the music ducks under them.
window.UnrugSound = (function () {
  const KEY = 'unruggabull-remastered-muted';
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = AC ? new AC() : null;
  let master = null, muted = false, paused = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (ctx) { master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination); }
  let muffle = null, musicIn = null, musicFilter = null, musicLevel = null, musicDuck = null, sfxBus = null, uiBus = null;
  if (ctx) {
    muffle = ctx.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 20000; muffle.connect(master);
    musicIn = ctx.createGain();
    musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 20000;
    musicLevel = ctx.createGain(); musicDuck = ctx.createGain();
    musicIn.connect(musicFilter); musicFilter.connect(musicLevel); musicLevel.connect(musicDuck); musicDuck.connect(muffle);
    sfxBus = ctx.createGain(); sfxBus.connect(muffle);
    uiBus = ctx.createGain(); uiBus.connect(master);
  }
  const busFor = name => name === 'music' ? musicIn : name === 'ui' ? uiBus : sfxBus;
  // the music ducks under a voice line, overlapping lines extending the dip
  let duckEnd = 0;
  function duck(secs) {
    if (!ctx) return;
    const now = ctx.currentTime, end = Math.max(duckEnd, now + secs), g = musicDuck.gain;
    duckEnd = end;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0.4, now + 0.12); g.setValueAtTime(0.4, end); g.linearRampToValueAtTime(1, end + 0.35);
  }

  const buffers = {}, loading = {};
  function load(url) {
    if (!ctx || !url) return Promise.resolve(null);
    if (!loading[url]) {
      loading[url] = fetch(url).then(r => r.arrayBuffer())
        .then(a => new Promise((ok, no) => ctx.decodeAudioData(a, ok, no)))
        .then(b => { buffers[url] = b; return b; })
        .catch(() => null);
    }
    return loading[url];
  }

  // iPhones only start audio when a sound is started inside the tap itself.
  function warm() {
    try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); s.connect(ctx.destination); s.start(0); } catch (e) {}
  }
  function init() {
    if (!ctx) return false;
    warm();
    if (!paused && ctx.state !== 'running') { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); }
    return true;
  }

  class Clip {
    // opts: bus ('music', 'sfx' or 'ui'), voice (levelled elsewhere; ducks the music), vary (a random pitch change, ± this)
    constructor(url, volume, opts) {
      opts = opts || {};
      this.voice = !!opts.voice;
      this.vary = opts.vary || 0;
      this.url = url || '';
      this.loop = false;
      this.paused = true;
      this._rate = 1;
      this._offset = 0;
      this._node = null;
      this._gain = ctx ? ctx.createGain() : null;
      this._out = ctx ? busFor(opts.bus) : null;
      this._pan = null;
      if (this._gain) this._gain.connect(this._out);
      this.volume = volume == null ? 1 : volume;
      load(this.url);
    }
    get src() { return this.url; }
    set src(u) { this._stop(); this.paused = true; this.url = u; this._offset = 0; load(u); }
    get volume() { return this._vol; }
    set volume(v) { this._vol = v; if (this._gain) { this._gain.gain.cancelScheduledValues(ctx.currentTime); this._gain.gain.value = v; } }
    // -1 (left) to 1 (right)
    set pan(v) {
      if (!ctx || !ctx.createStereoPanner || !isFinite(v)) return;
      if (!this._pan) { this._pan = ctx.createStereoPanner(); this._gain.disconnect(); this._gain.connect(this._pan); this._pan.connect(this._out); }
      this._pan.pan.value = Math.max(-1, Math.min(1, v));
    }
    // a fade of the clip's own level (the title music in and out)
    fadeTo(v, secs) {
      this._vol = v;
      if (!this._gain) return;
      const g = this._gain.gain, now = ctx.currentTime;
      g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(v, now + secs);
    }
    // the playing sound's speed, eased without restarting it (the slow-downs); back to the set rate after `hold`
    ease(factor, secs, hold, back) {
      if (!this._node) return;
      const p = this._node.playbackRate, now = ctx.currentTime, r = this._rate;
      p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(r * factor, now + secs);
      if (hold != null) { p.setValueAtTime(r * factor, now + secs + hold); p.linearRampToValueAtTime(r, now + secs + hold + back); }
    }
    get playbackRate() { return this._rate; }
    set playbackRate(r) {
      if (this._node) { const t = this.currentTime; this._stop(); this._rate = r; this._offset = t; this._begin(); }
      else this._rate = r;
    }
    get currentTime() {
      if (!this._node) return this._offset;
      const b = buffers[this.url];
      let t = this._from + (ctx.currentTime - this._at) * this._rate;
      if (b && this.loop) t %= b.duration;
      return t;
    }
    set currentTime(t) {
      const playing = !this.paused;
      this._stop();
      this._offset = t;
      if (playing) this._begin();
    }
    play() {
      if (this.paused) { this.paused = false; this._begin(); }
      return Promise.resolve();
    }
    pause() {
      if (this.paused) return;
      this._offset = this.currentTime;
      this._stop();
      this.paused = true;
    }
    _begin() {
      if (!ctx) return;
      const b = buffers[this.url];
      if (!b) {
        const url = this.url;
        load(url).then(() => { if (!this.paused && !this._node && this.url === url && buffers[url]) this._begin(); });
        return;
      }
      let off = this._offset;
      if (this.loop) off %= b.duration;
      else if (off >= b.duration) { this.paused = true; this._offset = 0; return; }
      const s = ctx.createBufferSource();
      const rate = this._rate * (this.vary ? 1 + (Math.random() * 2 - 1) * this.vary : 1);
      s.buffer = b; s.loop = this.loop; s.playbackRate.value = rate;
      if (this.voice) duck((b.duration - off) / rate);
      s.connect(this._gain);
      s.onended = () => {
        if (this._node !== s) return;
        this._node = null;
        if (!this.loop) { this.paused = true; this._offset = 0; }
      };
      this._at = ctx.currentTime; this._from = off; this._node = s;
      s.start(0, off);
    }
    _stop() {
      const s = this._node; this._node = null;
      if (s) { try { s.onended = null; s.stop(); } catch (e) {} }
    }
  }

  // ---------- the new sounds, made here (no files): menu blips, crackle, thuds, the heartbeat, sizzles ----------
  let noiseBuf = null;
  const T = s => ctx.currentTime + (s || 0);
  function noiseBuffer() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function out(dest, pan) {
    if (!pan || !isFinite(pan) || !ctx.createStereoPanner) return dest;
    const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(dest); return p;
  }
  // a tone sliding from f0 to f1
  function tone(type, f0, f1, at, dur, vol, dest, pan) {
    if (!ctx || ctx.state !== 'running') return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, T(at)); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, T(at) + dur);
    g.gain.setValueAtTime(0, T(at)); g.gain.linearRampToValueAtTime(vol, T(at) + 0.004); g.gain.exponentialRampToValueAtTime(0.0005, T(at) + dur);
    o.connect(g); g.connect(out(dest || sfxBus, pan)); o.start(T(at)); o.stop(T(at) + dur + 0.02);
  }
  // filtered noise: o = { type, freq, f1, q, attack, hold, release, pan, dest }
  function hiss(at, dur, vol, o) {
    if (!ctx || ctx.state !== 'running') return;
    o = o || {};
    const s = ctx.createBufferSource(); s.buffer = noiseBuffer(); s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.freq || 1000, T(at)); f.Q.value = o.q || 0.7;
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, T(at) + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, T(at)); g.gain.linearRampToValueAtTime(vol, T(at) + (o.attack || 0.003));
    if (o.hold) { g.gain.setValueAtTime(vol, T(at) + dur - (o.release || 0.2)); g.gain.linearRampToValueAtTime(0, T(at) + dur); }
    else g.gain.exponentialRampToValueAtTime(0.0005, T(at) + dur);
    s.connect(f); f.connect(g); g.connect(out(o.dest || sfxBus, o.pan)); s.start(T(at), Math.random()); s.stop(T(at) + dur + 0.02);
  }
  const thud = (freq, vol, len, at) => { tone('sine', freq * 2, freq, at || 0, len || 0.2, vol); hiss(at || 0, 0.05, vol * 0.5, { freq: 500 }); };
  // the music, moved
  function rampParam(p, to, secs, at) { const now = T(at); p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.exponentialRampToValueAtTime(Math.max(0.0001, to), now + secs); }
  function linParam(p, to, secs, at) { const now = T(at); p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(to, now + secs); }
  // the fire's crackle and low roar, a bed under the alley: pops scheduled a little ahead on the audio clock
  const bed = { a: null, b: null, level: 0, next: 0, timer: 0 };
  function crackle(level, secs) {
    if (!ctx) return;
    bed.level = level;
    if (!bed.a && level > 0) {
      const mk = (type, freq, q) => {
        const s = ctx.createBufferSource(); s.buffer = noiseBuffer(); s.loop = true;
        const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
        const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(sfxBus); s.start(); return g;
      };
      bed.a = mk('bandpass', 2600, 0.6); bed.b = mk('lowpass', 140, 0.7);
    }
    if (bed.a) { linParam(bed.a.gain, 0.012 * level, secs || 0.5); linParam(bed.b.gain, 0.05 * level, secs || 0.5); }
    if (!bed.timer && level > 0) {
      bed.next = ctx.currentTime;
      bed.timer = setInterval(() => {
        if (ctx.state !== 'running' || bed.level <= 0) return;
        while (bed.next < ctx.currentTime + 0.15) {
          bed.next = Math.max(bed.next, ctx.currentTime) + 0.03 + Math.random() * 0.14;
          hiss(bed.next - ctx.currentTime, 0.006 + Math.random() * 0.014, (0.04 + Math.random() * 0.18) * bed.level, { type: 'highpass', freq: 1200 + Math.random() * 2500 });
        }
      }, 50);
    }
  }
  // a slow heartbeat at low health
  const heart = { on: false, next: 0, timer: 0 };
  function heartbeat(on) {
    if (!ctx || heart.on === on) return;
    heart.on = on;
    if (on && !heart.timer) heart.timer = setInterval(() => {
      if (!heart.on || ctx.state !== 'running') return;
      if (heart.next < ctx.currentTime + 0.1) {
        heart.next = Math.max(heart.next + 0.85, ctx.currentTime + 0.05);
        const at = heart.next - ctx.currentTime;
        tone('sine', 70, 48, at, 0.16, 0.5); tone('sine', 62, 44, at + 0.2, 0.16, 0.32);
      }
    }, 50);
    if (!on && heart.timer) { clearInterval(heart.timer); heart.timer = 0; }
  }
  let emptyNode = null, hits = 0;
  const uiClips = {};
  const uiClip = (key, name, vol) => uiClips[key] || (uiClips[key] = new Clip(SND + name + '.mp3', vol, { bus: 'ui' }));
  const fx = {
    // the menus: little zaps, and the game's own blaster for a pick
    move(step) { const up = Math.pow(2, (step || 0) / 12); tone('square', 1500 * up, 950 * up, 0, 0.045, 0.045, uiBus); hiss(0, 0.018, 0.05, { type: 'highpass', freq: 3000, dest: uiBus }); },
    pick() { const c = uiClip('pick', 'blaster-fire', 0.05); c.playbackRate = 1.15; c.currentTime = 0; c.play(); tone('square', 700, 1500, 0, 0.07, 0.05, uiBus); },
    back() { tone('square', 1000, 420, 0, 0.09, 0.05, uiBus); },
    page(pan) { const c = uiClip('page', 'fire-swoosh', 0.22); c.volume = 0.22; c.playbackRate = 1.7; c.pan = pan || 0; c.currentTime = 0.12; c.play(); clearTimeout(c._t1); clearTimeout(c._t2); c._t1 = setTimeout(() => c.fadeTo(0, 0.1), 250); c._t2 = setTimeout(() => c.pause(), 400); },
    ok() { fx.pick(); tone('square', 520, 1040, 0, 0.12, 0.05, uiBus); tone('square', 1040, 1040, 0.12, 0.12, 0.04, uiBus); },
    // the alley
    crackle, heartbeat,
    tap(vol) { hiss(0, 0.045, vol || 0.18, { freq: 900, q: 1 }); },
    whoosh(pan) { hiss(0, 0.45, 0.12, { type: 'bandpass', freq: 600, f1: 2600, q: 1.2, pan, attack: 0.35 }); },
    sting() { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, i * 0.07, 0.2, 0.07)); },
    // out of shots: the 2025 buzz behind a trigger click, sagging in pitch as it fades; each press cuts the last
    empty() {
      if (!ctx || !buffers[SND + 'blaster-empty.mp3']) return;
      if (emptyNode) { try { emptyNode.stop(); } catch (e) {} }
      const s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = buffers[SND + 'blaster-empty.mp3']; s.connect(g); g.connect(sfxBus);
      g.gain.setValueAtTime(0.5, T()); g.gain.setValueAtTime(0.5, T(0.5)); g.gain.linearRampToValueAtTime(0, T(0.75));
      s.playbackRate.setValueAtTime(1, T(0.06)); s.playbackRate.linearRampToValueAtTime(0.72, T(0.75));
      s.start(T(0.012), 0, 0.8); emptyNode = s;
      hiss(0, 0.02, 0.2, { type: 'highpass', freq: 2500 }); tone('square', 2200, 1400, 0, 0.018, 0.05);
    },
    // the bull hit: a thud and the music dips and muffles for a beat
    hurt() {
      if (!ctx) return;
      thud(120, 0.35, 0.12);
      rampParam(musicFilter.frequency, 600, 0.05); musicFilter.frequency.setValueAtTime(600, T(0.25)); musicFilter.frequency.exponentialRampToValueAtTime(20000, T(0.9));
    },
    // the Rugfather
    garage() { tone('sine', 42, 38, 0, 13, 0.22); hiss(0, 13, 0.1, { freq: 90, hold: true, attack: 9, release: 1 }); crackle(1.6, 11); },
    bossHit() { thud(90, 0.4, 0.14); return ++hits; },
    sink() {
      if (!ctx) return;
      thud(70, 0.6, 0.3); hiss(0.05, 1, 0.08, { type: 'highpass', freq: 3000, f1: 1200 });
      rampParam(musicFilter.frequency, 250, 0.5); linParam(musicLevel.gain, 0, 0.55);
    },
    rise() { if (!ctx) return; musicFilter.frequency.setValueAtTime(250, T()); rampParam(musicFilter.frequency, 20000, 0.6); linParam(musicLevel.gain, 1, 0.3); },
    thump() { thud(42, 1, 0.6); hiss(0, 0.5, 0.25, { freq: 180 }); },
    tick() { thud(160, 0.25, 0.08); },
    sizzle(pan) { hiss(0, 0.9, 0.16, { type: 'highpass', freq: 3500, f1: 1500, pan }); thud(70, 0.4, 0.2); for (let i = 0; i < 8; i++) hiss(Math.random() * 0.7, 0.01, 0.08 + Math.random() * 0.12, { type: 'highpass', freq: 1500 + Math.random() * 2000, pan }); },
    // the last hit: a boom, and the music slows and muffles with the slow motion (0.3 s freeze, then 1 s)
    defeat(music) {
      if (!ctx) return;
      thud(38, 1, 1.4); hiss(0, 1.2, 0.3, { freq: 900, f1: 120 });
      if (music) music.ease(0.55, 0.4, 0.9, 0.4);
      rampParam(musicFilter.frequency, 400, 0.3); musicFilter.frequency.setValueAtTime(400, T(1.3)); musicFilter.frequency.exponentialRampToValueAtTime(20000, T(1.9));
    },
    // rugged: the music winds down and muffles to a stop
    windDown(music) {
      if (!ctx) return;
      if (music) music.ease(0.35, 1.4);
      rampParam(musicFilter.frequency, 300, 1.2); linParam(musicLevel.gain, 0, 1.6);
      setTimeout(() => { if (music && getGameState && getGameState() !== 'playing') music.pause(); }, 1700);
    },
    // a clear: a short sting with the congratulations
    fanfare() { [392, 523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.1 + i * 0.08, 0.35, 0.08)); },
    // back to an even mix (a new run)
    reset() {
      if (!ctx) return;
      for (const [p, v] of [[musicFilter.frequency, 20000], [musicLevel.gain, 1], [musicDuck.gain, 1], [muffle.frequency, 20000]]) { p.cancelScheduledValues(ctx.currentTime); p.setValueAtTime(v, ctx.currentTime); }
      duckEnd = 0; hits = 0; heartbeat(false);
    }
  };

  const api = {
    fx,
    clip: (url, volume, opts) => new Clip(url, volume, opts),
    // one-off sounds that may overlap, like each flaming carpet's whoosh
    play(url, volume) { const c = new Clip(url, volume); c.play(); return c; },
    preload: urls => urls.forEach(load),
    init,
    get muted() { return muted; },
    set muted(m) {
      muted = !!m;
      if (master) master.gain.value = muted ? 0 : 1;
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
    },
    // pause and resume everything that is playing, with the game: a quick muffle down, then the context stops
    setPaused(p) {
      paused = !!p;
      if (!ctx) return;
      if (paused) {
        if (ctx.state === 'running') {
          rampParam(muffle.frequency, 380, 0.18);
          setTimeout(() => { if (paused) { const q = ctx.suspend(); if (q && q.catch) q.catch(() => {}); } }, 200);
        } else { const q = ctx.suspend(); if (q && q.catch) q.catch(() => {}); }
      } else {
        const q = ctx.resume(); if (q && q.catch) q.catch(() => {});
        muffle.frequency.cancelScheduledValues(ctx.currentTime); muffle.frequency.setValueAtTime(380, ctx.currentTime);
        muffle.frequency.exponentialRampToValueAtTime(20000, ctx.currentTime + 0.25);
      }
    }
  };
  return api;
})();

// The 2025 game's sounds, under the names its code uses. Voice lines are levelled to one loudness (each file's
// integrated loudness, measured with ffmpeg's ebur128, brought to -17 LUFS, within ±12 dB) and duck the music.
const SND = 'sound/';
const LUFS = { 'unruggabull-jump': -25.3, 'unruggabull-ow': -9.1, 'unruggabull-oh-yeaaaa': -17.2, 'unruggabull-permanence': -24.1, 'unruggabull-lets-go': -25.9,
  'unruggabull-game-over': -23.2, 'unruggabull-goodbye-rugfather': -16.5, 'unruggabull-oh-shit': -27.9, 'unruggabull-do-do-do': -32, 'unruggabull-flawless-victory': -25.2,
  'rugfather-challenge-me': -14.7, 'rugfather-heat-things-up': -12.8, 'rugfather-muhahaha': -13.3, 'rugfather-ouch': -14.8, 'rugfather-ow': -12, 'rugfather-evil-laugh': -14.2,
  'rugfather-weave-remembers': -16.4, 'rugfather-hello-unruggabull': -14.5, 'rugfather-woven-into-rug': -13.8, 'garage-door-opening': -24.6 };
const levelled = name => Math.max(0.25, Math.min(4, Math.pow(10, (-17 - LUFS[name]) / 20)));
const voice = name => UnrugSound.clip(SND + name + '.mp3', levelled(name), { voice: true });
var bgMusic = UnrugSound.clip('', 0.3, { bus: 'music' });
bgMusic.loop = true;
var fireSound = UnrugSound.clip(SND + 'blaster-fire.mp3', 0.08, { vary: 0.06 });
// the jump grunt plays on every jump, so it stays at its 2025 level, under the levelled lines (louder was too much on a phone)
var jumpSound = UnrugSound.clip(SND + 'unruggabull-jump.mp3', 1, { vary: 0.04 });
var playerHitSound = voice('unruggabull-ow');
var difficultyIncreaseSounds = [voice('unruggabull-oh-yeaaaa'), voice('unruggabull-permanence')];
var unruggabullVoiceSounds = ['game-over', 'goodbye-rugfather', 'lets-go', 'oh-yeaaaa', 'ow', 'permanence', 'do-do-do', 'oh-shit', 'flawless-victory'].map(n => voice('unruggabull-' + n));
var carpshitDeathSound = UnrugSound.clip(SND + 'carpshit-death.mp3', 1, { vary: 0.08 });
var gameOverSound = voice('unruggabull-game-over');
var garageDoorSound = UnrugSound.clip(SND + 'garage-door-opening.mp3', levelled('garage-door-opening') * 0.8);
var garageDoorCloseSound = UnrugSound.clip(SND + 'garage-door-closing.mp3');
var fireWindsSwoosh = UnrugSound.clip(SND + 'fire-winds-swoosh.mp3');
var fireSwooshUrl = SND + 'fire-swoosh.mp3';
var evilLaughSfx = voice('rugfather-evil-laugh');
var helloUnruggabullSfx = voice('rugfather-hello-unruggabull');
var challengeMeSfx = voice('rugfather-challenge-me');
var wovenIntoRugSfx = voice('rugfather-woven-into-rug');
var heatThingsUpSfx = voice('rugfather-heat-things-up');
var muhahahaSfx = voice('rugfather-muhahaha');
var rugfatherWeaveRemembersSfx = voice('rugfather-weave-remembers');
// in the 2025 files but never played there; now on every fifth hit or so, and the last
var rugfatherOuchSfx = voice('rugfather-ouch');
var rugfatherOwSfx = voice('rugfather-ow');
var blasterEmptySound = UnrugSound.clip(SND + 'blaster-empty.mp3');
var flawlessVictorySound = voice('unruggabull-flawless-victory');
var titleMusic = UnrugSound.clip(SND + 'title-music.mp3', 0.5, { bus: 'music' });
titleMusic.loop = true;
var letsGoSound = voice('unruggabull-lets-go');
var UnrugSfx = UnrugSound.fx;
UnrugSound.preload([SND + 'alley-theme.mp3', fireSwooshUrl]);
