// Unruggabull: RugCo Alley Remastered, sound.
// The 2025 game played its mp3s through <audio> elements. Phones lag and drop those, so here every file is
// decoded once into Web Audio and played from memory. Each sound is a Clip with the few things the old code
// used on an <audio> element (play, pause, currentTime, volume, loop, src, playbackRate), so the game code
// reads as it did. Pausing the game suspends the whole context, so music and voices stop and pick up together.
// Browsers only allow sound after a tap or key press: init() runs on the first one.
window.UnrugSound = (function () {
  const KEY = 'unruggabull-remastered-muted';
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = AC ? new AC() : null;
  let master = null, muted = false, paused = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (ctx) { master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination); }

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
    constructor(url, volume) {
      this.url = url || '';
      this.loop = false;
      this.paused = true;
      this._rate = 1;
      this._offset = 0;
      this._node = null;
      this._gain = ctx ? ctx.createGain() : null;
      if (this._gain) this._gain.connect(master);
      this.volume = volume == null ? 1 : volume;
      load(this.url);
    }
    get src() { return this.url; }
    set src(u) { this._stop(); this.paused = true; this.url = u; this._offset = 0; load(u); }
    get volume() { return this._vol; }
    set volume(v) { this._vol = v; if (this._gain) this._gain.gain.value = v; }
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
      s.buffer = b; s.loop = this.loop; s.playbackRate.value = this._rate;
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

  const api = {
    clip: (url, volume) => new Clip(url, volume),
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
    // pause and resume everything that is playing, with the game
    setPaused(p) {
      paused = !!p;
      if (!ctx) return;
      const q = paused ? ctx.suspend() : ctx.resume();
      if (q && q.catch) q.catch(() => {});
    }
  };
  return api;
})();

// The 2025 game's sounds, under the names its code uses.
const SND = 'sound/';
var bgMusic = UnrugSound.clip('', 0.3);
bgMusic.loop = true;
var fireSound = UnrugSound.clip(SND + 'blaster-fire.mp3', 0.08);
var jumpSound = UnrugSound.clip(SND + 'unruggabull-jump.mp3');
var playerHitSound = UnrugSound.clip(SND + 'unruggabull-ow.mp3');
var difficultyIncreaseSounds = [
  UnrugSound.clip(SND + 'unruggabull-oh-yeaaaa.mp3'),
  UnrugSound.clip(SND + 'unruggabull-permanence.mp3')
];
var unruggabullVoiceSounds = [
  UnrugSound.clip(SND + 'unruggabull-game-over.mp3'),
  UnrugSound.clip(SND + 'unruggabull-goodbye-rugfather.mp3'),
  UnrugSound.clip(SND + 'unruggabull-lets-go.mp3'),
  UnrugSound.clip(SND + 'unruggabull-oh-yeaaaa.mp3'),
  UnrugSound.clip(SND + 'unruggabull-ow.mp3'),
  UnrugSound.clip(SND + 'unruggabull-permanence.mp3'),
  UnrugSound.clip(SND + 'unruggabull-do-do-do.mp3'),
  UnrugSound.clip(SND + 'unruggabull-oh-shit.mp3'),
  UnrugSound.clip(SND + 'unruggabull-flawless-victory.mp3')
];
var carpshitDeathSound = UnrugSound.clip(SND + 'carpshit-death.mp3');
var gameOverSound = UnrugSound.clip(SND + 'unruggabull-game-over.mp3');
var garageDoorSound = UnrugSound.clip(SND + 'garage-door-opening.mp3');
var garageDoorCloseSound = UnrugSound.clip(SND + 'garage-door-closing.mp3');
var fireWindsSwoosh = UnrugSound.clip(SND + 'fire-winds-swoosh.mp3');
var fireSwooshUrl = SND + 'fire-swoosh.mp3';
var evilLaughSfx = UnrugSound.clip(SND + 'rugfather-evil-laugh.mp3');
var helloUnruggabullSfx = UnrugSound.clip(SND + 'rugfather-hello-unruggabull.mp3');
var challengeMeSfx = UnrugSound.clip(SND + 'rugfather-challenge-me.mp3');
var wovenIntoRugSfx = UnrugSound.clip(SND + 'rugfather-woven-into-rug.mp3');
var heatThingsUpSfx = UnrugSound.clip(SND + 'rugfather-heat-things-up.mp3');
var muhahahaSfx = UnrugSound.clip(SND + 'rugfather-muhahaha.mp3');
var rugfatherWeaveRemembersSfx = UnrugSound.clip(SND + 'rugfather-weave-remembers.mp3');
var rugfatherOuchSfx = UnrugSound.clip(SND + 'rugfather-ouch.mp3');
var rugfatherOwSfx = UnrugSound.clip(SND + 'rugfather-ow.mp3');
var blasterEmptySound = UnrugSound.clip(SND + 'blaster-empty.mp3');
var flawlessVictorySound = UnrugSound.clip(SND + 'unruggabull-flawless-victory.mp3');
var titleMusic = UnrugSound.clip(SND + 'title-music.mp3', 0.5);
titleMusic.loop = true;
var letsGoSound = UnrugSound.clip(SND + 'unruggabull-lets-go.mp3');
UnrugSound.preload([SND + 'alley-theme.mp3', fireSwooshUrl]);
