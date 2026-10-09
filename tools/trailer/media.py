"""Re-render a take's sound for games that play <audio> elements (new Audio('boom.mp3').play()).

The harness logs every play, pause, seek, rate and volume change on every element, with times on the take's clock.
Each element's playback is rebuilt from that log and the same files are mixed in at those times, so the sound is
the game's own, in sync with the frames. Files named in trailer.json's audio.exclude (usually the music, which the
cut lays in itself) are left out.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile

SR = 48000
_cache = {}


def decode(path):
    """A media file as 48 kHz stereo float32."""
    path = str(path)
    if path not in _cache:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                             check=True, capture_output=True).stdout
        _cache[path] = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
    return _cache[path]


def segments(log, t_end):
    """Each element's stretches of playback: (t0, t1, src, pos, rate, vol, loop)."""
    els, out = {}, []

    def flush(e, t):
        if e['playing'] and t > e['t0']:
            out.append((e['t0'], t, e['src'], e['pos'], e['rate'], e['vol'], e['loop']))
            e['pos'] += (t - e['t0']) * e['rate']
        e['t0'] = t

    for ev in log:
        if 'ev' not in ev:
            continue
        e = els.setdefault(ev['id'], {'playing': False, 't0': 0, 'pos': 0.0, 'rate': 1.0, 'vol': ev.get('v', 1), 'src': ev['src'], 'loop': ev.get('loop')})
        t, kind = ev['t'], ev['ev']
        e['loop'] = ev.get('loop', e['loop'])
        if kind == 'play':
            if not e['playing']:
                e['playing'], e['t0'], e['src'], e['vol'] = True, t, ev['src'], ev.get('v', e['vol'])
                e['rate'] = ev.get('rate', e['rate'])
        elif kind == 'pause':
            flush(e, t); e['playing'] = False
        elif kind == 'seek':
            flush(e, t); e['pos'] = ev['val']
        elif kind == 'rate':
            flush(e, t); e['rate'] = ev['val'] or 1.0
        elif kind == 'vol':
            flush(e, t); e['vol'] = ev['val']
        elif kind == 'srcset':
            flush(e, t); e['playing'], e['pos'], e['src'] = False, 0.0, ev['val']
    for e in els.values():
        flush(e, t_end)
    return out


def mix(log, site, t0, t1, exclude=()):
    """Stereo float32 from t0 to t1 (take time)."""
    out = np.zeros((int((t1 - t0) * SR) + 1, 2), np.float32)
    for s0, s1, src, pos, rate, vol, loop in segments(log, t1):
        if not src or any(x in src for x in exclude):
            continue
        f = Path(site) / src.lstrip('/')
        if not f.is_file():
            continue
        a = decode(f)
        n = int((s1 - s0) * SR)
        idx = (pos * SR + np.arange(n) * rate).astype(np.int64)    # a playback rate changes pitch here; fine for effects
        if loop:
            idx %= len(a)
        idx = idx[idx < len(a)]
        if not len(idx):
            continue
        i0 = int((s0 - t0) * SR)
        if i0 < 0:
            idx = idx[-i0:]; i0 = 0
        seg = a[idx[:len(out) - i0]] * vol
        out[i0:i0 + len(seg)] += seg
    return out


def render(cfg, site, take_dir, log=print):
    """Writes take_dir/game.wav and take_dir/audio.json ({base: the take's time at sample 0}), like sound.render."""
    d = json.loads((take_dir / 'take.json').read_text())
    times = [e['t'] for e in d['snd'] if 'ev' in e] + (d['frames'][:1] or [d['marks'][0]['t']])
    base = min(times) - 0.05
    end = (d['frames'][-1] if d['frames'] else d['marks'][-1]['t']) + 1.0
    a = mix(d['snd'], site, base, end, cfg['audio'].get('exclude', ()))
    wavfile.write(str(take_dir / 'game.wav'), SR, a)
    (take_dir / 'audio.json').write_text(json.dumps({'base': base, 'dur': end - base}))
    log('sound %s: %.1fs from %d media events, peak %.2f' % (take_dir.name, end - base, len(d['snd']), np.abs(a).max()))
