"""The remaster trailer's music: the game's own RugCo Alley theme (120 BPM), cut to the trailer.

The theme's quiet intro under the two title screens, its full band from the drop for the mobile play and the polish,
silence while the garage opens (the game stops the music there too), the theme at 1.5x for the fight (the speed the
game plays it at once the Rugfather is angry), on through the board and ringing out a bar into the poster, where
"Goodbye, Rugfather." plays, as the 2025 trailer ends.
The game's own sounds (voice lines, the blaster, the end card's chime and fanfare) come from the takes.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'tools' / 'trailer'))
import media  # noqa: E402
from shots import DROP, BOSS, FIGHT, END, DUR, BAR, THEME_DROP   # noqa: E402

SR = 48000


def tempo(path, start, dur, rate):
    """`dur` seconds from `path` at `start`, `rate` times faster with the pitch kept, like the game's speed-ups."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(start), '-t', str(dur * rate + 0.2), '-i', str(path),
                          '-af', 'atempo=%g' % rate, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)[:int(dur * SR)].copy()


def render(path, site):
    theme = Path(site) / 'unruggabull-remastered/sound/alley-theme.mp3'
    a = media.decode(theme)
    out = np.zeros((int((DUR + 0.5) * SR), 2), np.float32)

    def put(sig, t):
        i = int(t * SR); k = min(len(sig), len(out) - i); out[i:i + k] += sig[:k]

    def shape(sig, fin=0.0, fout=0.03, tail=0.0):
        sig = sig.copy(); n = len(sig)
        if fin: f = int(fin * SR); sig[:f] *= np.linspace(0, 1, f)[:, None] ** 2
        if tail: f = int(tail * SR); sig[n - f:] *= np.linspace(1, 0, f)[:, None] ** 2
        f = int(fout * SR); sig[n - f:] *= np.linspace(1, 0, f)[:, None]
        return sig

    seg = lambda t0, t1: a[int(t0 * SR):int(t1 * SR)]
    put(shape(seg(THEME_DROP - DROP, THEME_DROP), fin=1.2), 0.0)                  # the intro, under the titles
    put(shape(seg(THEME_DROP, THEME_DROP + BOSS - DROP), fout=0.02), DROP)         # the drop
    # the fight, on through the board, ringing out a bar into the poster (as 2025)
    put(shape(tempo(theme, THEME_DROP + (BOSS - DROP), END - FIGHT + BAR / 1.5, 1.5), tail=BAR / 1.5), FIGHT)
    put(media.decode(Path(site) / 'unruggabull-remastered/sound/unruggabull-goodbye-rugfather.mp3') * 1.6, END + 0.35)
    wavfile.write(str(path), SR, out[:int(DUR * SR)])
