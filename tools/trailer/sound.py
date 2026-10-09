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
async ([log, base, dur, object, sr]) => {
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const resume = ctx.resume.bind(ctx);
  ctx.resume = () => Promise.resolve();            // the game's own resume() calls must not restart rendering early
  window.AudioContext = window.webkitAudioContext = function () { return ctx; };
  await new Promise((ok, fail) => { const s = document.createElement('script'); s.src = window.__audioSrc; s.onload = ok; s.onerror = fail; document.head.append(s); });
  const S = (0, eval)(object);
  const Q = 128 / sr, groups = new Map();
  for (const e of log) {
    const t = e.t - base; if (t < 0 || t >= dur - 0.01) continue;
    const k = Math.max(1, Math.round(t / Q));
    if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e);
  }
  const handles = {};
  let fails = 0;
  for (const [k, evs] of groups) {
    ctx.suspend(k * Q).then(() => {
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
  return { L: enc(0), R: enc(1), fails, n: groups.size };
}
"""


def render(pw, base_url, cfg, take_dir, log=print):
    """Writes take_dir/game.wav and take_dir/audio.json ({base: the take's time at sample 0})."""
    d = json.loads((take_dir / 'take.json').read_text())
    snd = d['snd']
    for i, e in enumerate(snd):
        e['idx'] = i
    init = cfg['audio'].get('init', 'init')
    starts = [e['t'] for e in snd if e.get('m') == init]
    if not starts:
        raise SystemExit('%s: the game never called %s.%s, so there is no sound to render' % (take_dir.name, cfg['audio']['object'], init))
    base = starts[0] - 0.05
    dur = (d['frames'][-1] if d['frames'] else d['marks'][-1]['t']) + 1.0 - base
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM'), args=['--autoplay-policy=no-user-gesture-required'])
    page = browser.new_page()
    page.goto(base_url + '404.html')
    page.evaluate('src => { window.__audioSrc = src; document.documentElement.innerHTML = "<head></head><body></body>"; }', base_url + cfg['audio']['script'])
    r = page.evaluate(JS, [snd, base, dur, cfg['audio']['object'], SR])
    browser.close()
    L = np.frombuffer(base64.b64decode(r['L']), dtype=np.float32)
    R = np.frombuffer(base64.b64decode(r['R']), dtype=np.float32)
    wavfile.write(str(take_dir / 'game.wav'), SR, np.stack([L, R], 1).astype(np.float32))
    (take_dir / 'audio.json').write_text(json.dumps({'base': base, 'dur': dur}))
    log('sound %s: %.1fs, %d moments, %d failed calls, peak %.2f' % (take_dir.name, dur, r['n'], r['fails'], max(abs(L).max(), abs(R).max())))
