"""The full trailer's cut (tools/trailer/make.py unruggabull-ii): about 36 s on grid.py's beats, no mega stream, no
ending.

0.00   the made opening, the teaser's tower move (teaser.js), over Saga II's intro; the logo on the first frames, for
       previews; p(Loom): HELLO, UNRUGGABULL.
6.32   real play, the expert bot at the controls, two bars a stage on Saga II's verse and chorus, a caption on each:
       the 13th Floor's hall, SHRED-O, the 48th Floor, the long ride, the roof (MAXIMIZE CARPETS); the chorus's last
       bar cut on its beats
25.26  the music stops: p(Loom) on the roof gives his odds, in its own words and voice from the take; LET'S GO!
30.11  the cover, PLAY NOW and jonniepeed.games on the title theme's verse
"""
import sys
from pathlib import Path

from PIL import Image

from cut import Cover, ease, fade, full, push

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import grid as G  # noqa: E402

B, BAR = G.BEAT, G.BAR
ODDS_LINE = 'talk:PROBABILITY OF YOUR SURVIVAL: 1%.'


def opening(out):
    """teaser.js's tower move, drawn once into the output folder (film.py's frames), 480 x 270 a frame."""
    d = out / 'opening'
    need = int(G.OPEN * 30) + 2
    if not (d / 'frames').is_dir() or len(list((d / 'frames').glob('*.png'))) < need:
        import film
        d.mkdir(parents=True, exist_ok=True)
        film.frames(d, need / 30)
    return d / 'frames'


def build(T, L, repo, site=None):
    H, S, F, E, Z = T['H'], T['S'], T['F'], T['E'], T['Z']
    out = H.path.parent
    frames = opening(out)
    FULL = full()

    m = lambda k: G.MONT + k * BAR                       # the montage's bar lines
    awake, f48, ride = S.mark('boss:awake'), F.mark('f48:fight'), E.mark('ev:elevator_wave')
    r1, odds = Z.mark('roof:round1'), Z.mark(ODDS_LINE)
    hall0 = H.windows[0][0]                              # the hall from its start
    shots = [
        # verse: the 13th Floor's hall, then moving day
        (m(0), m(2), H, hall0 + 4.0, push(1.0, 1.06, 960, 600, 2 * BAR)),
        (m(2), m(4), H, H.mark('event:move') + 1.0, FULL),
        # chorus: SHRED-O wakes, the 48th, the long ride, the roof
        (m(4), m(6), S, awake - 0.4, push(1.0, 1.08, 960, 500, 2 * BAR)),
        (m(6), m(8), F, f48 + 8.0, FULL),
        (m(8), m(10), E, ride + 6.0, FULL),
        (m(10), m(11), Z, r1 + 0.2, FULL),
        # the chorus's last bar on its beats
        (m(11), m(11) + B, S, awake + 9.0, FULL),
        (m(11) + B, m(11) + 2 * B, F, f48 + 20.0, FULL),
        (m(11) + 2 * B, m(11) + 3 * B, E, ride + 12.0, FULL),
        (m(11) + 3 * B, G.STOP, Z, Z.mark('ev:roof_attack', nth=2) + 0.6, FULL),
        # the stop: the odds, in p(Loom)'s words, held through LET'S GO (cut before its FIGHT)
        (G.STOP, G.TL, Z, odds - 0.15, push(1.0, 1.15, 960, 420, G.TL - G.STOP)),
    ]

    # captions in the game's font; SHRED-O's own banner names him, so his shot has none
    caps = [(m(0), m(2), L('c-hall')), (m(6), m(8), L('c-f48')), (m(8), m(10), L('c-ride')),
            (m(10), m(11), L('c-roof'))]
    logo = L('logo')

    def overlay(t, im):
        for a, b, cap in caps:
            if a <= t < b:
                k = min(ease((t - a) / .18), ease((b - t) / .18))
                im.alpha_composite(fade(cap, k))
        return im

    def open_(t):
        i = min(int(round(t * 30)), int(G.OPEN * 30))
        im = Image.open(frames / ('%05d.png' % i)).convert('RGB').resize((1920, 1080), Image.NEAREST).convert('RGBA')
        k = 1 - ease((t - .9) / .7)                       # the logo on the first frames (previews show the first)
        if k > 0: im.alpha_composite(fade(logo, k))
        return im

    cover = Cover(repo / 'brand/covers/unruggabull-ii.png', top=0, push=0.04, drift=0, dur=G.DUR - G.END)
    play, pill = L('play'), L('pill')

    def end(u):
        im = cover.frame(u)
        if u < .12:                                       # the slam: a white flash off the cover
            im.alpha_composite(Image.new('RGBA', im.size, (255, 255, 255, int(255 * (1 - u / .12)))))
        k = ease((u - B * 4) / .35)
        if k > 0: im.alpha_composite(fade(play, k, rise=14))
        k = ease((u - B * 6) / .35)
        if k > 0: im.alpha_composite(fade(pill, k, rise=14))
        return im

    return {'dur': G.DUR, 'open': (G.OPEN, open_), 'shots': shots, 'overlay': overlay, 'end': (G.END, end),
            'mix': {'game': 0.8, 'music': 0.75, 'drive': 1.5}}
