"""A small synth for trailer music: plucked strings, glockenspiel, brass stabs, pads, drums, a reverb and a master.

Each game's cue (tests/<slug>/trailer/music.py) writes its notes on a beat grid with these. Write the cue to the
edit's grid first, so every cut and hit lands on a beat.
"""
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

SR = 48000
rng = np.random.default_rng(7)


def seed(n):
    global rng
    rng = np.random.default_rng(n)


def midi(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(dur): return np.arange(int(dur * SR)) / SR


NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def n(s):
    """'C#5' -> MIDI number."""
    name, octv = (s[:2], s[2:]) if len(s) > 2 and s[1] in '#b' else (s[:1], s[1:])
    return 12 * (int(octv) + 1) + NOTE[name]


def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, btype='high', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, btype='low', fs=SR, output='sos'), x)


class Mix:
    """A stereo bus with a reverb send, on a beat grid."""

    def __init__(self, dur, bpm):
        self.dur, self.beat = dur, 60 / bpm
        self.bar = 4 * self.beat
        self.n = int(SR * (dur + 0.6))
        self.dry = np.zeros((2, self.n))
        self.send = np.zeros((2, self.n))

    def T(self, bar, beat):
        return bar * self.bar + beat * self.beat

    def put(self, sig, t, gain=1.0, pan=0.0, rev=0.0):
        i = int(round(t * SR))
        k = min(len(sig), self.n - i)
        if k <= 0: return
        th = (pan + 1) * np.pi / 4
        l, r = np.cos(th) * np.sqrt(2), np.sin(th) * np.sqrt(2)
        s = sig[:k] * gain
        self.dry[0, i:i + k] += s * l; self.dry[1, i:i + k] += s * r
        if rev:
            self.send[0, i:i + k] += s * l * rev; self.send[1, i:i + k] += s * r * rev

    def write(self, path, wet=0.5, peak=0.89, fade=0.25):
        """Reverb, a gentle soft clip, a fade at the end; float WAV at 48 kHz."""
        ir_t = tt(1.6)
        ir = np.stack([lp(rng.normal(0, 1, len(ir_t)), 5500) * np.exp(-ir_t / 0.32) for _ in range(2)])
        ir = np.concatenate([np.zeros((2, int(0.018 * SR))), ir], 1)
        ir /= np.sqrt((ir ** 2).sum(1, keepdims=True))
        wetsig = np.stack([fftconvolve(self.send[c], ir[c])[:self.n] for c in range(2)])
        mix = hp(self.dry + wetsig * wet, 30)
        mix /= np.abs(mix).max() / peak
        mix = np.tanh(mix * 1.15) / np.tanh(1.15) * peak
        mix = mix[:, :int(self.dur * SR)]
        f = int(fade * SR)
        mix[:, -f:] *= np.linspace(1, 0, f) ** 2
        wavfile.write(str(path), SR, mix.T.astype(np.float32))
        return mix


# ---------- instruments: each returns a mono signal
def pluck(f, dur=0.3, decay=0.994, bright=0.5, body=0.6):
    """Karplus-Strong string plus a sine body: pizzicato."""
    L = int(dur * SR); P = max(2, int(round(SR / f - 0.5)))
    exc = np.zeros(L); burst = rng.uniform(-1, 1, P)
    burst = lfilter([1 - bright, bright], [1], burst)
    exc[:P] = burst - burst.mean()
    a = np.zeros(P + 2); a[0] = 1; a[P] = -decay * 0.5; a[P + 1] = -decay * 0.5
    y = lfilter([1], a, exc)
    t = tt(dur)
    y = y / (np.abs(y).max() + 1e-9) + body * np.sin(2 * np.pi * f * t) * np.exp(-t / (dur * 0.45))
    env = np.exp(-t / (dur * 0.5)) * (1 - np.exp(-t / 0.002))
    fade = int(0.025 * SR); env[-fade:] *= np.linspace(1, 0, fade)
    return y * env / (1 + body)


def glock(f, dur=1.4, bright=1.0):
    t = tt(dur)
    s = np.zeros_like(t)
    for r, a, d in ((1, 1.0, 0.95), (2.76, 0.30 * bright, 0.32), (5.40, 0.12 * bright, 0.14), (8.93, 0.05 * bright, 0.07)):
        if f * r < SR / 2.2: s += a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
    s *= 1 - np.exp(-t / 0.0012)
    fade = int(0.04 * SR); s[-fade:] *= np.linspace(1, 0, fade)
    return s / 1.3


def brass(notes, dur=0.7, fc0=3200, tau=0.11, fcmin=700, release=0.22):
    t = tt(dur)
    fc = fc0 * np.exp(-t / tau) + fcmin
    s = np.zeros_like(t)
    for m in notes:
        for det in (-0.004, 0.004):
            f = midi(m) * (1 + det)
            for k in range(1, int(9000 / f)):
                s += (1 / k) / (1 + (k * f / fc) ** 4) * np.sin(2 * np.pi * k * f * t + rng.uniform(0, 6.28))
    env = (1 - np.exp(-t / 0.006)) * (0.45 + 0.55 * np.exp(-t / 0.12))
    rel = int(release * SR); env[-rel:] *= np.linspace(1, 0, rel) ** 2
    return s * env / (len(notes) * 1.6)


def pad(notes, dur, att=0.35, rel=0.8, cutoff=1500):
    t = tt(dur)
    s = np.zeros_like(t)
    for m in notes:
        for det in (-0.006, 0, 0.006):
            f = midi(m) * (1 + det)
            for k in range(1, int(5000 / f)):
                s += (1 / k) / (1 + (k * f / cutoff) ** 4) * np.sin(2 * np.pi * k * f * t + rng.uniform(0, 6.28))
    env = np.minimum(1, t / att)
    r = int(rel * SR); env[-r:] *= np.linspace(1, 0, r) ** 1.5
    return s * env / (len(notes) * 3)


def kick(dur=0.45):
    t = tt(dur)
    ph = 2 * np.pi * np.cumsum(46 + 110 * np.exp(-t / 0.035)) / SR
    return np.sin(ph) * np.exp(-t / 0.22) + hp(rng.uniform(-1, 1, len(t)), 2000) * np.exp(-t / 0.003) * 0.4


def snare(dur=0.3):
    t = tt(dur)
    return bp(rng.uniform(-1, 1, len(t)), 1400, 7500) * np.exp(-t / 0.10) * 0.9 + np.sin(2 * np.pi * 188 * t) * np.exp(-t / 0.05) * 0.6


def clap(dur=0.3):
    t = tt(dur)
    nz = bp(rng.uniform(-1, 1, len(t)), 900, 3200)
    env = np.zeros_like(t)
    for d in (0, 0.009, 0.018):
        env += (t >= d) * np.exp(-np.maximum(0, t - d) / (0.006 if d < 0.018 else 0.09))
    return nz * env


def hat(dur=0.08, open_=False):
    t = tt(dur)
    return hp(rng.uniform(-1, 1, len(t)), 7500) * np.exp(-t / (0.06 if open_ else 0.022))


def shaker(dur=0.1):
    t = tt(dur)
    return bp(rng.uniform(-1, 1, len(t)), 4500, 11000) * (1 - np.exp(-t / 0.012)) * np.exp(-t / 0.035)


def boom(dur=1.4):
    t = tt(dur)
    ph = 2 * np.pi * np.cumsum(34 + 26 * np.exp(-t / 0.12)) / SR
    return np.sin(ph) * np.exp(-t / 0.55) + lp(rng.uniform(-1, 1, len(t)), 220) * np.exp(-t / 0.06) * 1.5


def crash(dur=1.8):
    t = tt(dur)
    return hp(rng.uniform(-1, 1, len(t)), 4200) * np.exp(-t / 0.55) * (1 - np.exp(-t / 0.002))


def drone(notes, dur, att=0.9):
    t = tt(dur)
    s = sum(np.sin(2 * np.pi * midi(m) * t) + 0.25 * np.sin(4 * np.pi * midi(m) * t) for m in notes)
    env = np.minimum(1, t / att); r = int(0.4 * SR); env[-r:] *= np.linspace(1, 0, r)
    return s * (0.85 + 0.15 * np.sin(2 * np.pi * 5.2 * t)) * env / len(notes)
