"""The full trailer's music: all the game's own, recorded offline from its audio.js (chip.py) on grid.py's beats.

- Saga II's intro (152 BPM) under the made opening, then Saga II heavy (the roof's last phase, 170 BPM: its chorus and
  a verse) slammed in under the play on its downbeat, and cut dead on the verse's last bar line;
- p(Loom)'s HELLO, UNRUGGABULL. over the intro, in its recorded voice;
- LET'S GO! after the odds, then the title theme's verse (taken from bar 5 of a recording from the top, as the
  teaser lands its logo) with thunder, fading out at the end.
The game's sound effects and voices in the footage come from the takes themselves (cut.py mixes them in).
"""
import json
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import chip  # noqa: E402
import grid as G  # noqa: E402

SR = 48000


def _wav(p):
    return wavfile.read(str(p))[1].T.astype(np.float64)


def render(path):
    path = Path(path); cache = path.parent / 'music-parts'; cache.mkdir(exist_ok=True)
    n = int(G.DUR * SR); mix = np.zeros((2, n))
    # Saga II's intro, then Saga II heavy's chorus and verse slammed in on its downbeat, all their stems
    p = cache / 'intro.wav'
    if not p.is_file():
        js = ("UnrugSound.registerTrack('trailerIntro', Object.assign({}, UnrugRoofMusic.roofA, { order: ['I'], loop: 0, "
              "startPattern: 'I', name: 'Saga II, its intro' }));")   # the roof starts Saga II on its verse; here, the top
        chip.record('trailerIntro', G.OPEN + .5, p, extra_js=js)
    p2 = cache / 'heavy.wav'
    if not p2.is_file():
        js = ("UnrugSound.registerTrack('trailerHeavy', Object.assign({}, UnrugRoofMusic.roofAHeavy, { order: ['C', 'V'], loop: 0, "
              "name: 'Saga II heavy, chorus and verse' }));")
        chip.record('trailerHeavy', G.STOP - G.MONT + 1, p2, extra_js=js)
    a = _wav(p)[:, :int(G.OPEN * SR)]
    h = _wav(p2)[:, :int((G.STOP - G.MONT) * SR)]
    f = int(.01 * SR); a[:, -f:] *= np.linspace(1, 0, f)
    f = int(.02 * SR); h[:, -f:] *= np.linspace(1, 0, f)     # cut dead on the verse's last bar line
    mix[:, :a.shape[1]] += a * 1.8                          # the intro alone sits low; up so the opening isn't thin
    mix[:, int(G.MONT * SR):int(G.MONT * SR) + h.shape[1]] += h
    music_rms = np.sqrt(np.mean(h ** 2))
    # the theme's verse under the cover
    p = cache / 'theme.wav'
    if not p.is_file():
        chip.record('theme', 4 * G.BAR + G.DUR - G.TL + .5, p)
    th = _wav(p)[:, int(round(4 * G.BAR * SR)):][:, :n - int(G.TL * SR)]
    fi = int(.004 * SR); th[:, :fi] *= np.linspace(0, 1, fi)
    th *= music_rms / (np.sqrt(np.mean(th[:, :int(3 * SR)] ** 2)) + 1e-9)   # as loud as the chorus it follows
    mix[:, int(G.TL * SR):int(G.TL * SR) + th.shape[1]] += th
    # p(Loom)'s hello over the intro (its recorded voice), LET'S GO and the thunder under the cover
    cues = [(G.BAR + .12, 'UnrugSound.loomVoice("HELLO, UNRUGGABULL.")'), (G.GO, "UnrugSound.voice('go')"),
            (G.TL, "UnrugSound.play('thunder', 1.3)")]
    p = cache / 'cues.wav'
    chip.record(None, G.DUR + .5, p, extra_js=' '.join('setTimeout(() => %s, %d);' % (js, round(t * 1000)) for t, js in cues),
                trim=False, loom=True)
    x = _wav(p)[:, :n]
    mix[:, :x.shape[1]] += x * .8
    f = int(1.2 * SR); mix[:, -f:] *= np.linspace(1, 0, f) ** 2
    wavfile.write(str(path), SR, (mix / max(1e-9, np.abs(mix).max()) * .9).T.astype(np.float32))
