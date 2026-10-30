"""The teaser's music, three options to audition (owner, Oct 29: "good southern riff bluegrass heavy like the first game -
leading into the new game"; "music is the most important").

Each starts heavy and southern, a band of real-sounding instruments like the first game's, and ends by turning into the
new game: the title theme on Unruggabull II's own chip synth (chip.py records it), on its downbeat.

A  Hoedown: 152 BPM in D, the theme's tempo. A power-chord hit, then a train beat, banjo rolls, a heavy riff with a
   blue third, a fiddle tune over it, a breakdown, and the whole band crushed down to 8-bit into the theme.
B  Swamp stomp: a slow, sludgy slide-guitar riff over stomps and claps, then double time into a hoedown, crushed into
   the theme.
C  The first game's own RugCo Alley theme at its drop (the remaster's file), stopped like a tape into the theme.

    python3 tests/unruggabull-ii/trailer/options.py OUTDIR      # writes A.wav, B.wav, C.wav (and theme.wav)
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / 'tools' / 'trailer'))
sys.path.insert(0, str(HERE))
import synth  # noqa: E402

SR = 48000
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
        'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def hz(s):
    name, octv = (s[:2], s[2:]) if len(s) > 2 and s[1] in '#b' else (s[:1], s[1:])
    return 440.0 * 2 ** ((NOTE[name] + 12 * (int(octv) + 1) - 69) / 12)


def tt(d): return np.arange(int(d * SR)) / SR
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
rng = np.random.default_rng(29)


# ---------- instruments (mono)
def ks(f, dur, decay=.996, bright=.6):
    """A plucked string (Karplus-Strong)."""
    L, P = int(dur * SR), max(2, int(round(SR / f)))
    buf = rng.uniform(-1, 1, P); buf = lp(buf, 1500 + 9000 * bright) if bright < 1 else buf
    out = np.zeros(L); out[:P] = buf
    for i in range(P, L):
        out[i] = decay * .5 * (out[i - P] + out[i - P - 1] if i - P - 1 >= 0 else out[i - P])
    return out


def ks_fast(f, dur, decay=.996, bright=.6):
    """The same string, vectorised a period at a time (fast enough for chords)."""
    L, P = int(dur * SR), max(2, int(round(SR / f)))
    seg = rng.uniform(-1, 1, P)
    seg = lp(seg, 1200 + 10000 * bright)
    out = np.zeros(L + P)
    out[:P] = seg
    for i in range(P, L, P):
        prev = out[i - P:i]
        nxt = decay * .5 * (prev + np.roll(prev, 1))
        out[i:i + P] = nxt[:min(P, L + P - i)]
    return out[:L]


def banjo(f, dur=.35):
    s = ks_fast(f, dur, decay=.985, bright=.95)
    t = tt(dur)
    s = hp(s, 300) + .4 * bp(s, 1800, 4200) * np.exp(-t / .05)          # the drum head's twang
    return s * (1 - np.exp(-t / .001))


def drive(x, gain=14, tone=3800):
    """An overdriven amp into a speaker cabinet."""
    return lp(hp(np.tanh(hp(x, 90) * gain), 80), tone, 4) * .6


def power(root, dur, mute=False, fifth=7, octave=True):
    """A power chord, or a palm-muted chug, through the amp."""
    f0 = hz(root); s = np.zeros(int(dur * SR))
    for k in [0, fifth] + ([12] if octave else []):
        s += ks_fast(f0 * 2 ** (k / 12), dur, decay=.96 if mute else .9985, bright=.5 if mute else .75)
    if mute: s *= np.exp(-tt(dur) / .09)
    return drive(s, 18 if mute else 14)


def bend(f0, f1, dur, at=.0, gain=14, vib=0.0):
    """A bent or slid note: a saw through the amp, gliding from f0 to f1 (starting `at` into the note)."""
    t = tt(dur); g = np.clip((t - at) / max(.01, dur * .35), 0, 1)
    f = f0 * (f1 / f0) ** (g * g * (3 - 2 * g)) * (1 + vib * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / .3, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = 2 * ((ph / (2 * np.pi)) % 1) - 1
    s += .5 * (2 * (((ph * 1.003) / (2 * np.pi)) % 1) - 1)
    env = (1 - np.exp(-t / .004)) * np.exp(-t / (dur * 1.6))
    return drive(s * env, gain)


def fiddle(f, dur, slide=None, vib=.007):
    """A bowed fiddle: a saw with vibrato, a scratchy bow attack, and the body's resonances."""
    t = tt(dur)
    f0 = f if slide is None else slide
    glide = np.clip(t / .07, 0, 1)
    fr = (f0 + (f - f0) * glide) * (1 + vib * np.sin(2 * np.pi * 6.2 * t) * np.clip((t - .08) / .15, 0, 1))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    s = 2 * ((ph / (2 * np.pi)) % 1) - 1
    s = .55 * bp(s, 400, 900) + .8 * bp(s, 2000, 3600) + .25 * lp(s, 6000)
    s += bp(rng.normal(0, 1, len(t)), 2500, 7000) * .06 * np.exp(-t / .05)
    env = np.clip(t / .025, 0, 1) * np.clip((dur - t) / .03, 0, 1)
    return s * env


def bass(f, dur):
    t = tt(dur)
    s = ks_fast(f, dur, decay=.998, bright=.3) + .6 * np.sin(2 * np.pi * f * t) * np.exp(-t / (dur * .8))
    return lp(s, 900) * np.clip((dur - t) / .02, 0, 1)


def stomp():
    t = tt(.4)
    return lp(synth.kick(.4)[:len(t)], 300) * 1.2 + bp(rng.normal(0, 1, len(t)), 150, 600) * np.exp(-t / .03) * .8


# ---------- a stereo bus on a beat grid
class Bus:
    def __init__(self, dur, bpm):
        self.a = np.zeros((2, int((dur + 2) * SR))); self.beat = 60 / bpm
    def T(self, bar, beat=0): return (bar * 4 + beat) * self.beat
    def put(self, s, t, g=1.0, pan=0.0):
        i = int(round(t * SR)); k = min(len(s), self.a.shape[1] - i)
        if k <= 0: return
        th = (pan + 1) * np.pi / 4
        self.a[0, i:i + k] += s[:k] * g * np.cos(th) * 1.414; self.a[1, i:i + k] += s[:k] * g * np.sin(th) * 1.414


def crush(a, t0, t1, sr0=48000, sr1=3500, b0=16, b1=4):
    """Turn the band into 8-bit between t0 and t1: the sample rate and the bit depth fall together (a band becoming
    a chip), and stay down after t1."""
    out = a.copy(); i0, i1 = int(t0 * SR), int(t1 * SR)
    held = np.zeros(2); hold = 0.0
    for i in range(i0, out.shape[1]):
        k = min(1, (i - i0) / max(1, i1 - i0)); k = k * k
        rate = sr0 * (sr1 / sr0) ** k; bits = b0 + (b1 - b0) * k
        hold += rate / SR
        if hold >= 1: hold -= 1; q = 2 ** (bits - 1); held = np.round(a[:, i] * q) / q
        out[:, i] = held
    return out


def tape_stop(a, t0, dur):
    """A tape stopping from t0 over dur: the pitch and speed fall to nothing."""
    i0, n = int(t0 * SR), int(dur * SR)
    pos = np.cumsum(np.linspace(1, 0, n) ** 1.5)
    seg = np.stack([np.interp(pos, np.arange(a.shape[1] - i0), a[c, i0:]) for c in range(2)])
    seg *= np.linspace(1, 0, n) ** .5
    return np.concatenate([a[:, :i0], seg], 1)


def master(a):
    a = a / (np.abs(a).max() + 1e-9) * 1.4
    return np.tanh(a) / np.tanh(1.4) * .9


def theme(out_dir):
    p = Path(out_dir) / 'theme.wav'
    if not p.is_file():
        import chip
        chip.record('theme', 9.5, p)
    sr, a = wavfile.read(str(p))
    return a.T.astype(np.float64)


def join(band, t_cut, chip_theme, level=1.0):
    """The band up to t_cut, then the chip theme from its first downbeat, loud as the band was."""
    b = band[:, :int(t_cut * SR)]
    rms_b = np.sqrt(np.mean(b[:, -int(SR * 1.5):] ** 2)) + 1e-9
    rms_c = np.sqrt(np.mean(chip_theme[:, :int(SR * 2)] ** 2)) + 1e-9
    return np.concatenate([b, chip_theme * (rms_b / rms_c) * level], 1)


# ---------- A: Hoedown, 152 BPM in D
def option_a(chip_theme):
    m = Bus(20, 152); b, T, put = m.beat, m.T, m.put
    s16 = b / 4
    # bar 0: the hit, then a banjo roll into the riff
    put(power('D2', 2.4), 0, .9); put(synth.kick(.5), 0, .9); put(synth.crash(2.2), 0, .35, .2); put(synth.boom(1.6), 0, .5)
    put(bass(hz('D1'), 1.4), 0, .8)
    roll = ['D4', 'F#4', 'A4', 'D5', 'A4', 'F#4', 'D5', 'A4']
    for i, n in enumerate(roll): put(banjo(hz(n)), T(0, 2) + i * s16, .5, -.3)
    for i in range(4): put(synth.snare(.15), T(0, 3) + i * s16, .25 + .1 * i, .1)
    # the riff: eighths, D chugs with a blue third hammered on, and a bend on the turn
    RIFF = [['D2', 'D2', 'F2', 'F#2', 'A2', 'D2', 'C3', 'A2'], ['D2', 'D2', 'F2', 'F#2', 'A2', 'G2', 'F2', 'E2']]
    for bar in range(1, 10):
        line = RIFF[(bar - 1) % 2]
        heavy = bar >= 8
        for i, n in enumerate(line):
            t = T(bar, i / 2)
            if n == 'D2': put(power('D2', b / 2 * .95, mute=True), t, .75 if not heavy else .9)
            elif bar % 2 == 0 and i == 7: put(bend(hz('E3'), hz('F#3'), b * .6, gain=16), t, .45)
            else: put(power(n, b / 2 * .95, octave=False), t, .6)
            put(bass(hz(n) / 2, b / 2 * .9), t, .7)
        # train beat: kick on 1 and 3 (doubled when heavy), snare sixteenths with the backbeat accented
        for q in range(16):
            t = T(bar, q / 4)
            put(synth.snare(.08), t, (.32 if q in (4, 12) else .07) * (1.3 if heavy else 1), .08)
            if q in (0, 8) or (heavy and q % 2 == 0) or q in (7, 10): put(synth.kick(.3), t, .75 if q in (0, 8) else .5)
            if q % 2 == 0: put(synth.hat(.04), t, .05, -.3)
        if bar in (1, 5, 8): put(synth.crash(1.8), T(bar), .22, .25)
        # banjo rolls all the way (a forward roll on the chord's tones)
        ch = ['D4', 'F#4', 'A4', 'D5'] if line[5] == 'D2' or bar % 2 else ['C4', 'E4', 'G4', 'C5']
        pat = [0, 1, 3, 0, 2, 3, 0, 1, 3, 0, 2, 3, 0, 1, 2, 3]
        for q in range(16): put(banjo(hz(ch[pat[q]])), T(bar, q / 4), .3 if bar < 4 else .22, -.35)
    # the fiddle: a hoedown tune over bars 4-9 (eighths; '-' holds)
    TUNE = {4: 'A4 D5 F#5 A5 G5 F#5 E5 D5', 5: 'C5 D5 E5 F#5 G5 A5 G5 E5', 6: 'A4 D5 F#5 A5 B5 A5 F#5 D5', 7: 'C6 A5 G5 E5 D5 - - -',
            8: 'A5 B5 A5 F#5 D6 - C6 A5', 9: 'G5 A5 G5 E5 D5 C5 A4 C5'}
    for bar, line in TUNE.items():
        notes = line.split(); i = 0
        while i < 8:
            n = notes[i]; k = 1
            while i + k < 8 and notes[i + k] == '-': k += 1
            sl = hz(n) * 2 ** (-2 / 12) if i == 0 and bar in (4, 8) else None
            put(fiddle(hz(n), b / 2 * k * .97, slide=sl), T(bar, i / 2), .5, .25)
            if bar >= 8: put(fiddle(hz(n) * 2 ** (-4 / 12), b / 2 * k * .97), T(bar, i / 2), .28, -.1)   # a harmony a third down
            i += k
    # bar 10: the breakdown: half-time hits; bar 11: chromatic climb, a snare roll, and the band crushed to 8-bit
    for beat, n in ((0, 'D2'), (1.5, 'F2'), (2.5, 'G2'), (3, 'G#2')):
        put(power(n, b * 1.4), T(10, beat), .85); put(synth.kick(.4), T(10, beat), .9); put(bass(hz(n) / 2, b * 1.2), T(10, beat), .8)
    put(synth.crash(2), T(10), .3)
    for i, n in enumerate(['A2', 'A#2', 'B2', 'C3']):
        put(power(n, b * .95), T(11, i), .85); put(synth.kick(.3), T(11, i), .8)
    for q in range(16): put(synth.snare(.1), T(11, q / 4), .15 + .3 * q / 15, .05)
    put(fiddle(hz('A5'), b * 4, slide=hz('D5')), T(11), .5, .2)
    band = crush(m.a, T(11, 2), T(12))
    return master(join(band, T(12), chip_theme))


# ---------- B: Swamp stomp, half time, then double time
def option_b(chip_theme):
    slow = Bus(12, 76); b, T, put = slow.beat, slow.T, slow.put
    # bar 0: a slide-guitar dive onto the low D, a stomp and the crash
    put(bend(hz('D4'), hz('D2'), b * 2.2, at=.05, gain=20), 0, .7)
    put(power('D2', b * 3.5), T(0, .5), .8); put(stomp(), 0, 1); put(synth.crash(2.4), 0, .3); put(synth.boom(2), 0, .5)
    RIFF = [(0, 'D2', 1), (1, 'D2', .5), (1.5, 'F2', .5), (2, 'G2', .75), (2.75, 'G#2', .25), (3, 'A2', .5), (3.5, 'C3', .5)]
    for bar in range(1, 3):
        for beat, n, ln in RIFF:
            put(power(n, b * ln * .95, mute=ln < .5), T(bar, beat), .8); put(bass(hz(n) / 2, b * ln * .9), T(bar, beat), .8)
        for beat in range(4):
            put(stomp(), T(bar, beat), .95 if beat % 2 == 0 else .6)
            if beat % 2: put(synth.clap(.3), T(bar, beat), .55, .1); put(synth.snare(.2), T(bar, beat), .2)
        # the slide answers each riff
        put(bend(hz('A3'), hz('C4'), b * 1.2, at=.1, gain=16, vib=.01), T(bar, 3.5), .38, .3)
        put(bend(hz('D4'), hz('D4'), b * 1.5, gain=16, vib=.012), T(bar, .5) if bar == 2 else T(bar, 3.9), .3, .3)
        for q in range(0, 16, 2): put(banjo(hz(['D3', 'A3', 'D4', 'F4'][q // 2 % 4])), T(bar, q / 4), .18, -.4)
    slow_end = T(3)
    # double time: the hoedown at 152, two bars of riff with the fiddle, then the crush
    fast = Bus(9, 152); fb, FT, fput = fast.beat, fast.T, fast.put
    RF = ['D2', 'D2', 'F2', 'F#2', 'A2', 'D2', 'C3', 'A2']
    for bar in range(3):
        for i, n in enumerate(RF):
            fput(power(n, fb / 2 * .95, mute=(n == 'D2'), octave=False), FT(bar, i / 2), .8); fput(bass(hz(n) / 2, fb / 2 * .9), FT(bar, i / 2), .7)
        for q in range(16):
            fput(synth.snare(.08), FT(bar, q / 4), .3 if q in (4, 12) else .07, .08)
            if q % 4 == 0 or q in (6, 14): fput(synth.kick(.3), FT(bar, q / 4), .75)
        for q in range(16): fput(banjo(hz(['D4', 'F#4', 'A4', 'D5'][[0, 1, 3, 0, 2, 3, 0, 1][q % 8]])), FT(bar, q / 4), .25, -.35)
    for i, n in enumerate('A4 D5 F#5 A5 G5 F#5 E5 D5 C5 D5 E5 F#5 G5 A5 G5 E5 A5 - - - G5 - - -'.split()):
        if n != '-': fput(fiddle(hz(n), fb / 2 * (4 if i in (16, 20) else 1) * .95), FT(0, i / 2), .5, .25)
    fput(synth.crash(1.8), 0, .3)
    for i, n in enumerate(['A2', 'A#2', 'B2', 'C3']): fput(power(n, fb * .95), FT(3, i), .85); fput(synth.kick(.3), FT(3, i), .8)
    for q in range(16): fput(synth.snare(.1), FT(3, q / 4), .15 + .3 * q / 15, .05)
    fast.a = crush(fast.a, FT(3, 2), FT(4))
    a = np.concatenate([slow.a[:, :int(slow_end * SR)], fast.a[:, :int(FT(4) * SR)]], 1)
    return master(join(a, a.shape[1] / SR, chip_theme))


# ---------- C: the first game's own theme at its drop, then a tape stop into the new one
def option_c(chip_theme):
    src = ROOT / 'site/unruggabull-remastered/sound/alley-theme.mp3'
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', '21.35', '-t', '12.6', '-i', str(src), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.float32).reshape(-1, 2).T.astype(np.float64)
    a[:, :int(.01 * SR)] *= np.linspace(0, 1, int(.01 * SR))
    a = tape_stop(a, 12.0, .55)                                       # six bars at 120, then the tape stops
    a = np.concatenate([a, np.zeros((2, int(.12 * SR)))], 1)          # a breath, then the chip theme
    return master(join(a, a.shape[1] / SR, chip_theme, level=1.1))


def alley(t0, dur):
    """The first game's RugCo Alley theme (the remaster's file), from t0 for dur seconds, at 48 kHz stereo."""
    src = ROOT / 'site/unruggabull-remastered/sound/alley-theme.mp3'
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(dur), '-i', str(src), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).T.astype(np.float64)


def atempo(a, rate):
    """Stretch a stereo clip to 1/rate of its length, pitch kept (ffmpeg's atempo)."""
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', '-af', 'atempo=%.5f' % rate,
                        '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], input=a.T.astype(np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.float32).reshape(-1, 2).T.astype(np.float64)


DROP, BEAT = 21.35, .5            # the alley theme's drop, on its beat grid (0.35 + 0.5k), at 120 BPM
THEME_BEAT = 60 / 152             # Unruggabull II's title theme


def option_c1(chip_theme):
    """The drop for two riff cycles, then two bars that speed up from 120 to the theme's 152, beat by beat, crushing
    into 8-bit as they go; the chip theme lands on the next downbeat, already in its tempo."""
    head = alley(DROP, 8.0)                                            # bars 0-3 as they are
    ramp = alley(DROP + 8.0, 4.2)
    beats, n = [], 8
    for i in range(n):
        rate = (152 / 120) ** ((i + 1) / n)                             # each beat a little quicker; the last at 152
        seg = ramp[:, int(i * BEAT * SR):int(((i + 1) * BEAT + .03) * SR)]
        beats.append(atempo(seg, rate))
    out = head; xf = int(.012 * SR)
    for b in beats:
        L = int(round(b.shape[1] * BEAT / (BEAT + .03)))       # the beat's own length; the 30 ms after it is overlap
        tail = out[:, -xf:].copy()
        out = np.concatenate([out, b[:, :L]], 1)
        i = out.shape[1] - L
        out[:, i:i + xf] = tail * np.linspace(1, 0, xf) + out[:, i:i + xf] * np.linspace(0, 1, xf)
    t_land = out.shape[1] / SR
    out = crush(out, t_land - 4 * THEME_BEAT * 1.15, t_land, sr1=4000, b1=4)    # the last bar turns to chip
    return master(join(out, t_land, chip_theme, level=1.05))


def option_c2(chip_theme):
    """The drop for three riff cycles at full speed; the last bar dissolves into 8-bit, and the chip theme lands on the
    bar line."""
    a = alley(DROP, 12.3)
    a = crush(a, 10.0, 12.0, sr1=3600, b1=4)
    return master(join(a, 12.0, chip_theme, level=1.05))


if __name__ == '__main__':
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    ch = theme(out)
    for name, f in (('A', option_a), ('B', option_b), ('C', option_c), ('C1', option_c1), ('C2', option_c2)):
        a = f(ch)
        wavfile.write(str(out / (name + '.wav')), SR, a.T.astype(np.float32))
        print('%s: %.1f s' % (name, a.shape[1] / SR))
