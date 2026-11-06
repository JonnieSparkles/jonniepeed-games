"""The full trailer's cut (tools/trailer/make.py unruggabull-ii): about 34 s on grid.py's beats, no mega stream, no
ending.

0.00   the made opening, the teaser's tower move (teaser.js), over Saga II's intro; the logo on the first frames, for
       previews; p(Loom): HELLO, UNRUGGABULL.
6.32   real play, the expert bot at the controls, on Saga II heavy (170 BPM): six shots of two bars, each one whole
       moment that lands before the cut (owner, Nov 6: the first cut was "sporadic", cut "before something finishes",
       and the 13th Floor wasn't epic): rush hour, lights out's WIPED OUT!, SHRED-O's marathon rally, the 48th's chain,
       the roof's laser and its FIRST PASS. Slow pushes, a punch-in on each impact, captions in the game's font
23.26  the music stops: p(Loom) on the roof gives his odds, in its own words and voice from the take; LET'S GO!
28.11  the cover, PLAY NOW and jonniepeed.games on the title theme's verse
"""
import math
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
    H, S, F, Z = T['H'], T['S'], T['F'], T['Z']
    out = H.path.parent
    frames = opening(out)
    FULL = full()

    m = lambda k: G.MONT + k * G.HBAR                    # the play's bar lines, Saga II heavy's
    D2 = 2 * G.HBAR                                      # a shot: two bars, one whole moment
    rush, wipe = H.mark('event:rush'), H.mark('ev:wipe', after='event:dark')
    marathon = S.mark("talk:LET'S GO THE DISTANCE.")
    chain = F.mark('ev:f48_break:spinner')
    attack, pass1, odds = Z.mark('ev:roof_attack'), Z.mark('ev:roof_set'), Z.mark(ODDS_LINE)

    def cam(z0, z1, cx, cy, hits=()):
        """A slow push over the shot, and a small punch-in on each impact (shot-local times)."""
        return lambda u: (z0 + (z1 - z0) * ease(u / D2) + sum(.045 * math.exp(-(u - h) / .14) for h in hits if u >= h), cx, cy)

    # Each shot starts just before its moment and cuts after it lands (picked from the footage, placed by markers):
    shots = [
        # the chorus: rush hour's stampede down the hall, every carpshit on the floor charging him
        (m(0), m(2), H, rush + 4.5, cam(1.0, 1.08, 960, 700)),
        # lights out: the hall dark, and WIPED OUT! as the whole swarm pops
        (m(2), m(4), H, wipe - 1.3, cam(1.04, 1.12, 960, 640, hits=(1.3,))),
        # SHRED-O's marathon rally, slashed back again and again, to MARATHON X6
        (m(4), m(6), S, marathon + 2.6, cam(1.0, 1.1, 960, 560, hits=(.6, 1.2, 1.8, 2.35))),
        # the 48th: a chain of machines blowing, to CHAIN X5
        (m(6), m(8), F, chain - 0.2, cam(1.0, 1.08, 1000, 560, hits=(.2, 1.1, 1.9))),
        # the verse: the roof. A warning, the laser, the eye open and his shots going in
        (m(8), m(10), Z, attack - 0.1, cam(1.0, 1.08, 960, 520, hits=(2.5,))),
        # FIRST PASS: the whole roof red but one tile
        (m(10), m(12), Z, pass1 - 0.4, cam(1.02, 1.1, 960, 600)),
        # the stop: the odds, in p(Loom)'s words, held through LET'S GO (cut before its FIGHT)
        (G.STOP, G.TL, Z, odds - 0.15, push(1.0, 1.15, 960, 420, G.TL - G.STOP)),
    ]

    caps = [(m(0), m(2), L('c-hall')), (m(6), m(8), L('c-f48')), (m(8), m(10), L('c-roof'))]
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
