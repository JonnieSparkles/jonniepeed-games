"""Re-render a take's game sound offline from its logged calls.

The game's own audio script is loaded into a blank page whose AudioContext constructor hands back one
OfflineAudioContext. Each logged call is replayed at its time (the context suspends there, the call runs, the
context resumes), with the sound object's state flags as they were. The result is the game's real sound, in exact
sync with the frames, without recording anything.
"""
import base64
import json
import os

import numpy as np
from scipy.io import wavfile

SR = 48000

JS = r"""
async ([log, base, dur, object, sr, timers]) => {
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const resume = ctx.resume.bind(ctx);
  ctx.resume = () => Promise.resolve();            // the game's own resume() calls must not restart rendering early
  window.AudioContext = window.webkitAudioContext = function () { return ctx; };
  const Q = 128 / sr, TICK = 8;                    // rendering stops every 128 samples at most; timers run every 8 stops
  // Timers on the audio clock: a game that schedules its own music from setInterval or setTimeout (Thimbleful) gets
  // called back at the right moment of the render, however fast the render runs.
  const queue = []; let nextId = 1;
  if (timers) {
    const add = (fn, ms, every, args) => { const id = nextId++; ms = Math.max(0, +ms || 0) / 1000;
      queue.push({ id, fn, args, at: ctx.currentTime + ms, every: every ? Math.max(Q, ms) : 0 }); return id; };
    window.setTimeout = (fn, ms, ...a) => add(fn, ms, false, a);
    window.setInterval = (fn, ms, ...a) => add(fn, ms, true, a);
    window.clearTimeout = window.clearInterval = id => { const i = queue.findIndex(q => q.id === id); if (i >= 0) queue.splice(i, 1); };
  }
  const runTimers = () => {
    for (let n = 0; n < 10000; n++) {
      let due = null;
      for (const q of queue) if (q.at <= ctx.currentTime + 1e-9 && (!due || q.at < due.at)) due = q;
      if (!due) return;
      if (due.every) due.at += due.every; else queue.splice(queue.indexOf(due), 1);
      try { due.fn(...due.args); } catch (e) {}
    }
  };
  await new Promise((ok, fail) => { const s = document.createElement('script'); s.src = window.__audioSrc; s.onload = ok; s.onerror = fail; document.head.append(s); });
  const S = (0, eval)(object);
  const groups = new Map();
  for (const e of log) {
    const t = e.t - base; if (t < 0 || t >= dur - 0.01) continue;
    const k = Math.max(1, Math.round(t / Q));
    if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e);
  }
  if (timers) for (let k = TICK; k * Q < dur - 0.01; k += TICK) if (!groups.has(k)) groups.set(k, []);
  const handles = {};
  let fails = 0;
  for (const [k, evs] of groups) {
    ctx.suspend(k * Q).then(() => {
      runTimers();
      for (const e of evs) {
        try {
          if (e.stop !== undefined) { const h = handles[e.stop]; if (h) h(); continue; }
          Object.assign(S, e.s || {});
          const r = S[e.m](...e.a);
          if (typeof r === 'function') handles[e.idx] = r;
        } catch (err) { fails++; }
      }
      resume();
    });
  }
  const buf = await ctx.startRendering();
  const enc = ch => { const f = buf.getChannelData(ch), b = new Uint8Array(f.buffer.slice(0)); let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  return { L: enc(0), R: enc(1), fails, n: log.length };
}
"""


def replay(pw, base_url, cfg, calls, base, dur):
    """Replays logged calls (times minus `base`) into a fresh sound object; returns (stereo float32, report)."""
    for i, e in enumerate(calls):
        e.setdefault('idx', i)
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM'), args=['--autoplay-policy=no-user-gesture-required'])
    page = browser.new_page()
    page.goto(base_url + '404.html')
    page.evaluate('src => { window.__audioSrc = src; document.documentElement.innerHTML = "<head></head><body></body>"; }', base_url + cfg['audio']['script'])
    r = page.evaluate(JS, [calls, base, dur, cfg['audio']['object'], SR, bool(cfg['audio'].get('timers'))])
    browser.close()
    L = np.frombuffer(base64.b64decode(r['L']), dtype=np.float32)
    R = np.frombuffer(base64.b64decode(r['R']), dtype=np.float32)
    return np.stack([L, R], 1).astype(np.float32), r


def render_score(pw, base_url, cfg, passes, dur, path, log=print):
    """The game's sound for the whole cut, from shots.py's spec['score']: a list of passes, each {calls, until}.
    Each pass is its own fresh sound object (a call's `t` is trailer time); `until` ends that pass with a 20 ms fade,
    so one pass can carry the music and effects up to the end card and another play what comes after."""
    out = np.zeros((int(dur * SR), 2), np.float32)
    for i, p in enumerate(passes):
        a, r = replay(pw, base_url, cfg, p['calls'], 0.0, dur)
        a = a[:len(out)]
        if p.get('until') is not None:
            j = int(p['until'] * SR); f = int(0.02 * SR)
            a[max(0, j - f):j] *= np.linspace(1, 0, min(f, j))[:, None]; a[j:] = 0
        out[:len(a)] += a
        log('score pass %d: %d calls, %d failed, peak %.2f' % (i, r['n'], r['fails'], np.abs(a).max()))
    wavfile.write(str(path), SR, out)
    return path


def render(pw, base_url, cfg, take_dir, log=print):
    """Writes take_dir/game.wav and take_dir/audio.json ({base: the take's time at sample 0})."""
    d = json.loads((take_dir / 'take.json').read_text())
    snd = d['snd']
    init = cfg['audio'].get('init', 'init')
    starts = [e['t'] for e in snd if e.get('m') == init]
    if not starts:
        raise SystemExit('%s: the game never called %s.%s, so there is no sound to render' % (take_dir.name, cfg['audio']['object'], init))
    base = starts[0] - 0.05
    dur = (d['frames'][-1] if d['frames'] else d['marks'][-1]['t']) + 1.0 - base
    a, r = replay(pw, base_url, cfg, snd, base, dur)
    L, R = a[:, 0], a[:, 1]
    wavfile.write(str(take_dir / 'game.wav'), SR, a)
    (take_dir / 'audio.json').write_text(json.dumps({'base': base, 'dur': dur}))
    log('sound %s: %.1fs, %d moments, %d failed calls, peak %.2f' % (take_dir.name, dur, r['n'], r['fails'], max(abs(L).max(), abs(R).max())))
