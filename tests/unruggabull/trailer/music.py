"""Unruggabull's trailer music: the game's own RugCo Alley theme (120 BPM), cut to the trailer, plus two voice lines.

The theme's quiet intro under the title screen, its full band from the drop for the alley, silence while the
garage door opens (the game stops the music there too), then the theme at 1.5x for the fight, the speed the game
plays it at when the Rugfather gets angry. "Let's go!" lands on the drop and "Goodbye, Rugfather." on the end card.
"""
import subprocess
import numpy as np
from scipy.io import wavfile
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'tools' / 'trailer'))
import media  # noqa: E402
from shots import DROP, BOSS, FIGHT, END, DUR, BAR, THEME_DROP   # noqa: E402

SR = 48000


def tempo(path, start, dur, rate):
    """`dur` seconds of output from `path` at `start`, played `rate` times faster with the pitch kept, like the
    browser's playbackRate."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(start), '-t', str(dur * rate + 0.2), '-i', str(path),
                          '-af', 'atempo=%g' % rate, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)[:int(dur * SR)].copy()


def render(path, site):
    theme = Path(site) / 'assets/audio/bgm/rugco_alley_theme.mp3'
    sfx = Path(site) / 'assets/audio/sfx/unruggabull'
    a = media.decode(theme)
    out = np.zeros((int((DUR + 0.5) * SR), 2), np.float32)

    def put(sig, t, gain=1.0):
        i = int(t * SR); k = min(len(sig), len(out) - i); out[i:i + k] += sig[:k] * gain

    def fades(sig, fin=0.0, fout=0.03):
        sig = sig.copy(); n = len(sig)
        if fin: f = int(fin * SR); sig[:f] *= np.linspace(0, 1, f)[:, None] ** 2
        f = int(fout * SR); sig[n - f:] *= np.linspace(1, 0, f)[:, None]
        return sig

    seg = lambda t0, t1: a[int(t0 * SR):int(t1 * SR)]
    put(fades(seg(THEME_DROP - DROP, THEME_DROP), fin=1.2), 0.0)                 # the intro, under the title screen
    put(fades(seg(THEME_DROP, THEME_DROP + BOSS - DROP), fout=0.02), DROP)        # the drop: the alley
    fight = tempo(theme, THEME_DROP + (BOSS - DROP), END - FIGHT + BAR / 1.5, 1.5)
    k = int((END - FIGHT) * SR)
    fight[k:] *= np.linspace(1, 0, len(fight) - k)[:, None] ** 2              # rings out a bar into the end card
    put(fades(fight, fout=0.01), FIGHT)
    put(media.decode(sfx / 'unruggabull-lets-go.mp3'), DROP - 0.85, 1.6)
    put(media.decode(sfx / 'unruggabull-goodbye-rugfather.mp3'), END + 0.35, 1.6)
    wavfile.write(str(path), SR, out[:int(DUR * SR)])
