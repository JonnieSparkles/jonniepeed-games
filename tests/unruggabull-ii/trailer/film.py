"""Film the Unruggabull II teaser: teaser.js's picture at 30 fps, 4x to 1920 x 1080, with its soundtrack, all made from
the game's own art and sound.

    python3 tests/unruggabull-ii/trailer/film.py                # work/trailer/unruggabull-ii/unruggabull-ii-teaser.mp4
    python3 tests/unruggabull-ii/trailer/film.py --out DIR
    python3 tests/unruggabull-ii/trailer/film.py --picture      # new picture on the sound already in the folder
    python3 tests/unruggabull-ii/trailer/film.py --sound        # new sound on the frames already in the folder

The sound, recorded offline from the game's audio.js (chip.py) on the cut's timeline:
- the machine waking (bridge.js teaserWake, four bars) into the title theme's four-bar build, switched on the bar line
  by the game's own sequencer, and cut on the build's last bar line;
- the theme's verse from its first downbeat under the logo (recorded from the top, taken from bar 5);
- p(Loom)'s two lines in its blip voice, brought up to sit just under the music; thunder and "LET'S GO!".
Takes about 2 minutes on 2 CPUs, and the same every build (chip.py seeds the synth's noise). Listen before posting: levels and timing are checked by script, the feel isn't.
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

SR, FPS = 48000, 30
SITE = ROOT / 'site' / 'unruggabull-ii'
PAGE_SCRIPTS = ['bull.js', 'sprites.js', 'art.js', 'intro-stills.js', 'title-art.js', 'voice.js', 'audio.js']
NAME = 'unruggabull-ii-teaser'


def page(out):
    p = Path(out) / 'teaser-page.html'
    p.write_text('<!doctype html><body style="margin:0;background:#000"><canvas id="c" width="480" height="270"></canvas>' +
                 ''.join('<script src="%s"></script>' % (SITE / f).as_uri() for f in PAGE_SCRIPTS) +
                 '<script src="%s"></script></body>' % (HERE / 'teaser.js').as_uri())
    return p


def cut_info(out):
    """The cut's length, its stop and logo times, its bar and its sound cues, from teaser.js."""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=['--allow-file-access-from-files']); pg = b.new_page()
        pg.goto(page(out).as_uri())
        r = pg.evaluate('() => { const c = UnrugTeaser.make(); return { dur: c.dur, stop: c.stop, tl: c.tl, bar: UnrugTeaser.BAR, sfx: c.sfx }; }')
        b.close()
    return r


def cues_js(sfx):
    """setTimeout calls for the game's sound, at each cue's time in the cut."""
    out = []
    for t, what in sfx:
        if what == 'thunder': js = "UnrugSound.play('thunder', 1.3)"
        elif what == 'go': js = "UnrugSound.voice('go')"
        elif what.startswith('say:'): js = 'UnrugSound.say(%s, "loom")' % json.dumps(what[4:])
        else: raise ValueError(what)
        out.append('setTimeout(() => %s, %d);' % (js, round(t * 1000)))
    return ' '.join(out)


def wav(p):
    return wavfile.read(str(p))[1].T.astype(np.float64)


def sound(out, info):
    b, stop, tl, n = info['bar'], info['stop'], info['tl'], int(info['dur'] * SR)
    mix = np.zeros((2, n))
    # the machine waking into the theme's build: four bars of bridge, the theme switched in on its last bar line
    p = Path(out) / 'bridge.wav'
    if not p.is_file():
        js = (HERE / 'bridge.js').read_text() + "\nsetTimeout(() => UnrugSound.music('theme', { boundary: 'bar' }), %d);" % int(3.5 * b * 1000)
        chip.record('teaserWake', 8 * b, p, extra_js=js)
    br = wav(p)[:, :int(stop * SR)]
    f = int(.02 * SR); br[:, -f:] *= np.linspace(1, 0, f)                  # cut on the build's last bar line
    mix[:, :br.shape[1]] += br
    music_rms = np.sqrt(np.mean(br[:, int(4 * b * SR):] ** 2))
    # the logo lands on the theme's verse, the release after the build (owner, Oct 30: "we shouldn't restart the theme
    # song, it should land on ... the part after the build"): recorded from the top, taken from bar 5's downbeat
    p = Path(out) / 'theme.wav'
    if not p.is_file():
        chip.record('theme', 4 * b + info['dur'] - tl + .5, p)
    th = wav(p)[:, int(round(4 * b * SR)):][:, :n - int(tl * SR)]
    fi = int(.004 * SR); th[:, :fi] *= np.linspace(0, 1, fi)
    mix[:, int(tl * SR):int(tl * SR) + th.shape[1]] += th
    # p(Loom) (its blips are quiet in the game, so they come up to sit just under the music), thunder and LET'S GO
    for key, keep in (('say', lambda w: w.startswith('say:')), ('fx', lambda w: not w.startswith('say:'))):
        p = Path(out) / ('%s.wav' % key)
        chip.record(None, info['dur'] + .5, p, extra_js=cues_js([c for c in info['sfx'] if keep(c[1])]), trim=False)
        x = wav(p)[:, :n]
        if key == 'say':
            v = x[:, np.abs(x).max(0) > 1e-4]; x = x * .7 * music_rms / (np.sqrt(np.mean(v ** 2)) + 1e-9)
        else:
            x = x * .6
        mix[:, :x.shape[1]] += x
    f = int(1.2 * SR); mix[:, -f:] *= np.linspace(1, 0, f) ** 2
    return loud(mix)


def loud(a, target=-13.0):
    """Bring the mix up to `target` dB RMS (over its sounding parts), soft-clipping the peaks."""
    s = a[:, np.abs(a).max(0) > 1e-3]
    g = 10 ** ((target - 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9)) / 20)
    return .95 * np.tanh(a * g / .95)


def frames(out, dur):
    from playwright.sync_api import sync_playwright
    d = Path(out) / 'frames'; d.mkdir(exist_ok=True)
    for f in d.glob('*.png'): f.unlink()
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=['--allow-file-access-from-files']); pg = b.new_page()
        pg.goto(page(out).as_uri())
        pg.evaluate('async () => { await UnrugTeaser.ready(); window.__cut = UnrugTeaser.make(); window.__g = document.getElementById("c").getContext("2d"); }')
        for i in range(int(dur * FPS)):
            u = pg.evaluate('t => { __cut.draw(__g, t); return __g.canvas.toDataURL(); }', i / FPS)
            (d / ('%05d.png' % i)).write_bytes(base64.b64decode(u.split(',')[1]))
        b.close()
    return d


def main(argv):
    out = Path(argv[argv.index('--out') + 1]) if '--out' in argv else ROOT / 'work' / 'trailer' / 'unruggabull-ii'
    out.mkdir(parents=True, exist_ok=True)
    info = cut_info(out)
    w = out / 'mix.wav'
    if '--picture' not in argv:
        wavfile.write(str(w), SR, sound(out, info).T.astype(np.float32))
    d = frames(out, info['dur']) if '--sound' not in argv else out / 'frames'
    mp4 = out / (NAME + '.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', str(d / '%05d.png'), '-i', str(w),
                    '-vf', 'scale=1920:1080:flags=neighbor', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', str(mp4)], check=True)
    print('%.2f s -> %s' % (info['dur'], mp4))


if __name__ == '__main__':
    main(sys.argv[1:])
