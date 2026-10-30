"""Film the Unruggabull II teaser: teaser.js's picture at 30 fps, 4x to 1920 x 1080, with its soundtrack.

    python3 tests/unruggabull-ii/trailer/film.py OUTDIR [A|B ...] [--sound]     # --sound: new sound, frames kept

A  "The machine wakes": 2 s of the first game's RugCo Alley drop, the tape stop, the bridge (bridge.js teaserWake) on
   the new game's synth into the title theme (options.py), with thunder and "LET'S GO!" from the game's sound.
B  "Saga II": all the game's own sound, recorded in one take: thunder, p(Loom)'s "HELLO, UNRUGGABULL.", the roof
   fight's heavy chorus (roofAHeavy), the odds, "LET'S GO!" and the title theme.
"""
import base64
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
import chip  # noqa: E402
import options as O  # noqa: E402

SR, FPS = 48000, 30
SITE = ROOT / 'site' / 'unruggabull-ii'
PAGE_SCRIPTS = ['bull.js', 'sprites.js', 'art.js', 'intro-stills.js', 'title-art.js', 'voice.js', 'audio.js']


def cut_info(name):
    """The cut's length and sound cues, from teaser.js."""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=['--allow-file-access-from-files']); pg = b.new_page()
        pg.goto(page(Path('/tmp')).as_uri())
        r = pg.evaluate('n => { const c = UnrugTeaser.make(n); return { dur: c.dur, sfx: c.sfx, shots: c.shots.map(s => [s[0], s[1]]) }; }', name)
        b.close()
    return r


def page(out):
    p = Path(out) / 'teaser-page.html'
    p.write_text('<!doctype html><body style="margin:0;background:#000"><canvas id="c" width="480" height="270"></canvas>' +
                 ''.join('<script src="%s"></script>' % (SITE / f).as_uri() for f in PAGE_SCRIPTS) +
                 '<script src="%s"></script></body>' % (HERE / 'teaser.js').as_uri())
    return p


def cues_js(sfx):
    """setTimeout calls for the game's sound, at each cue's time in the cut."""
    out = []
    for t, what in sfx:
        if what == 'thunder': js = "UnrugSound.play('thunder', 1.3)"
        elif what == 'go': js = "UnrugSound.voice('go')"
        elif what == 'stop': js = "UnrugSound.music(null, { hard: true })"
        elif what.startswith('say:'): js = 'UnrugSound.say(%s, "loom")' % json.dumps(what[4:])
        elif what.startswith('music:'): js = "UnrugSound.music(%s, { slam: true })" % json.dumps(what[6:])
        else: raise ValueError(what)
        out.append('setTimeout(() => %s, %d);' % (js, round(t * 1000)))
    return ' '.join(out)


def sound_a(out, info):
    """option_e's 2 s taste, tape stop and machine wakes into the theme, with the cut's thunder and LET'S GO added on
    the same level as the chip music."""
    b_, th = O.BAR152, 2.85 + 4 * O.BAR152
    theme_s = info['dur'] - th
    a = O.alley(O.DROP, 2.6); a[:, :int(.01 * SR)] *= np.linspace(0, 1, int(.01 * SR))
    a = O.tape_stop(a, 2.0, .55)
    band_rms = np.sqrt(np.mean(a[:, :int(2.0 * SR)] ** 2))
    a = np.concatenate([a, np.zeros((2, int(2.85 * SR) - a.shape[1]))], 1)
    br = O.bridge(out, 'teaserWake', 4, round(theme_s, 2))
    g = band_rms / (np.sqrt(np.mean(br[:, int(4 * b_ * SR):int((4 * b_ + 3) * SR)] ** 2)) + 1e-9)
    mix = np.concatenate([a, br * g], 1)
    sfx_p = Path(out) / 'sfx-A.wav'
    chip.record(None, info['dur'] + .5, sfx_p, extra_js=cues_js(info['sfx']), trim=False)
    sfx = wavfile.read(str(sfx_p))[1].T.astype(np.float64)
    n = min(mix.shape[1], sfx.shape[1]); mix = mix[:, :int(info['dur'] * SR)]
    mix[:, :n] += sfx[:, :n] * g * .6               # thunder and LET'S GO a little under the music's peaks
    return mix


def sound_b(out, info):
    """Recorded as three takes on the cut's timeline (the music, p(Loom) and his voice, the thunder) and mixed: p(Loom)'s
    blips are quiet in the game, so they come up to sit just under the music; the title theme comes up to the roof
    chorus's level, so the logo lands at least as loud as what came before it."""
    parts = {}
    for key, keep in (('music', lambda w: w.startswith('music:') or w == 'stop'), ('say', lambda w: w.startswith('say:')),
                      ('go', lambda w: w == 'go'), ('fx', lambda w: w == 'thunder')):
        p = Path(out) / ('chip-B-%s.wav' % key)
        chip.record(None, info['dur'] + .5, p, extra_js=cues_js([c for c in info['sfx'] if keep(c[1])]), trim=False)
        x = wavfile.read(str(p))[1].T.astype(np.float64)
        parts[key] = np.pad(x, ((0, 0), (0, max(0, int(info['dur'] * SR) - x.shape[1]))))[:, :int(info['dur'] * SR)]
    rms = lambda x, t0, t1: np.sqrt(np.mean(x[:, int(t0 * SR):int(t1 * SR)] ** 2)) + 1e-9
    cue = {w: t for t, w in info['sfx']}
    c0, stop, th = cue['music:roofAHeavy'], cue['stop'], cue['music:theme']
    chorus = rms(parts['music'], c0, stop)
    m = parts['music'].copy(); m[:, int(th * SR):] *= chorus / rms(m, th + .1, info['dur'] - 1.5)
    say = parts['say']; voiced = say[:, np.abs(say).max(0) > 1e-4]
    say_g = .7 * chorus / (np.sqrt(np.mean(voiced ** 2)) + 1e-9)
    return m + say * say_g + parts['go'] + parts['fx']


def loud(a, target=-13.0):
    """Bring the mix up to `target` dB RMS (over its sounding parts), soft-clipping the peaks."""
    s = a[:, np.abs(a).max(0) > 1e-3]
    g = 10 ** ((target - 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9)) / 20)
    return .95 * np.tanh(a * g / .95)


def frames(out, name, dur):
    from playwright.sync_api import sync_playwright
    d = Path(out) / ('frames-' + name); d.mkdir(exist_ok=True)
    for f in d.glob('*.png'): f.unlink()
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=['--allow-file-access-from-files']); pg = b.new_page()
        pg.goto(page(out).as_uri())
        pg.evaluate('async n => { await UnrugTeaser.ready(); window.__cut = UnrugTeaser.make(n); window.__g = document.getElementById("c").getContext("2d"); }', name)
        for i in range(int(dur * FPS)):
            u = pg.evaluate('t => { __cut.draw(__g, t); return __g.canvas.toDataURL(); }', i / FPS)
            (d / ('%05d.png' % i)).write_bytes(base64.b64decode(u.split(',')[1]))
        b.close()
    return d


def film(out, name, picture=True):
    info = cut_info(name)
    mix = (sound_a if name == 'A' else sound_b)(out, info)
    f = int(1.2 * SR); mix[:, -f:] *= np.linspace(1, 0, f) ** 2
    mix = loud(mix)
    wav = Path(out) / ('teaser-%s.wav' % name); wavfile.write(str(wav), SR, mix.T.astype(np.float32))
    d = frames(out, name, info['dur']) if picture else Path(out) / ('frames-' + name)
    mp4 = Path(out) / ('unruggabull-ii-teaser-%s.mp4' % name)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', str(d / '%05d.png'), '-i', str(wav),
                    '-vf', 'scale=1920:1080:flags=neighbor', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', str(mp4)], check=True)
    print('%s: %.2f s -> %s' % (name, info['dur'], mp4))
    return info


if __name__ == '__main__':
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    names = [n for n in sys.argv[2:] if n != '--sound'] or ['A', 'B']
    for n in names:
        film(out, n, picture='--sound' not in sys.argv)
