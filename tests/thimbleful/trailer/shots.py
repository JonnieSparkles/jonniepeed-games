"""The cut: about 15 s on the game's own music, which re-renders in one pass under the whole cut (see the score).

The music is ThimbleSound's own loop, steered the way a run steers it: four cozy bars in C major at 132 BPM, then at
the top of the loop the storm turns it minor, with drums, at 158 BPM. Cuts land on that grid.

0.00   the windowsill at sunset with the title over the sky: she plants the seed and the can slides in
2.17   bar 2, "Catch the drips.": pushed in on her first catches
3.99   bar 3, "Grow a sunflower.": the sunflower blooms (score 14)
5.80   bar 4: a gold drop, and the butterfly lands on the grown sunflower
7.62   bar 5, the storm: a lightning flash at night, "Then the storm rolls in.", the manic can feints
9.14   bar 6: a spill, then the last catches as lightning strikes
10.66  a white flash and thunder into the end card: the cover, the studio mark and jonniepeed.games, and the
       game's title jingle
"""
from cut import Cover, ease, fade, full, push, score_calls

SR_Q = 128 / 48000                    # the score starts the music one render quantum in
M0 = SR_Q + 0.35                      # ThimbleSound.start(): the loop's first step is 0.35 s after the call
COZY_BPM, STORM_BPM = 132, 158        # intensity(40, 0) and intensity(60, 1): 108 + min(32, s * 0.6) + 18 * edge
E1, E2 = 60 / COZY_BPM / 2, 60 / STORM_BPM / 2   # an eighth note: the loop's step
BAR1, BAR2 = 8 * E1, 8 * E2
STORM = M0 + 4 * BAR1                 # the top of the loop, where the storm turns it minor
END = STORM + 2 * BAR2
DUR = END + 3.95
KEEP = {'plant', 'catch', 'gold', 'milestone', 'spill', 'earn', 'thunder'}   # effects; the score plays the music itself


def bar(k):
    return M0 + (k - 1) * BAR1 if k <= 5 else STORM + (k - 5) * BAR2


def build(T, L, repo):
    A, B = T['A'], T['B']
    intro = A.mark('state:intro')
    bloom = A.mark('score:14')
    gold = A.mark('snd:gold', after='score:35')       # the gold drop that brings the butterfly (score 45)
    bolt = B.mark('bolt', after='manic', nth=6)
    spill = B.mark('snd:spill', after='bolt', nth=1)
    last = B.mark('bolt', after='manic', nth=7)
    FULL = full()
    W = 20                                                    # the canvas, scaled 20x: 96 logical px across 1920

    shots = [
        (0.0, bar(2), A, intro - 0.25, push(1.0, 1.05, 960, 540, bar(2))),
        (bar(2), bar(3), A, intro + 3.4, push(1.12, 1.35, 30 * W, 33 * W, BAR1)),
        (bar(3), bar(4), A, bloom - 4 * E1, push(1.3, 1.45, 14 * W, 24 * W, BAR1)),
        (bar(4), bar(5), A, gold - 0.62, FULL),
        (bar(5), bar(5) + BAR2 / 2, B, bolt - 0.03, FULL),
        (bar(5) + BAR2 / 2, bar(6), B, bolt - 0.03 + BAR2 / 2, push(2.0, 2.3, 68 * W, 8 * W, BAR2 / 2)),   # it feints, shuddering
        (bar(6), bar(6) + BAR2 / 2, B, spill - 0.42, push(1.2, 1.3, 40 * W, 34 * W, BAR2 / 2)),
        (bar(6) + BAR2 / 2, END, B, last - 0.70, FULL),   # a gold catch, then lightning just before the cut
    ]

    title, cap1, cap2, cap3, pill = L('title'), L('cap1'), L('cap2'), L('cap3'), L('pill')

    def overlay(t, im):
        if t < bar(2):
            im.alpha_composite(fade(title, 1 - ease((t - 1.15) / 0.35)))
        elif t < bar(3):
            im.alpha_composite(fade(cap1, ease((t - bar(2) - 0.05) / 0.2), rise=10))
        elif t < bar(4):
            im.alpha_composite(fade(cap2, ease((t - bar(3) - 0.05) / 0.2), rise=10))
        elif bar(5) <= t < bar(5) + BAR2 / 2:   # off again for the close-up on the can
            im.alpha_composite(fade(cap3, ease((t - bar(5) - 0.08) / 0.15)))
        if t > END - 0.1:                                     # the last lightning goes white into the end card
            im.alpha_composite(flash(im.size, ease((t - END + 0.1) / 0.1)))
        return im

    cover = Cover(repo / 'brand/covers/thimbleful.png', top=40, push=0.05, drift=10, dur=DUR - END)

    def end(u):
        im = cover.frame(u)
        k = ease((u - 0.9) / 0.35)
        if k > 0: im.alpha_composite(fade(pill, k, rise=14))
        w = 1 - ease(u / 0.45)
        if w > 0: im.alpha_composite(flash(im.size, w))
        return im

    # the score: the game's music steered through the cut, the effects of every shot, then the end card's thunder and jingle
    steer = [{'t': 0.0, 'm': 'start', 'a': []}, {'t': 0.01, 'm': 'intensity', 'a': [40, 0]},
             {'t': STORM - E1, 'm': 'intensity', 'a': [60, 1]}]
    after = [{'t': END - 0.3, 'm': 'init', 'a': []}, {'t': END, 'm': 'thunder', 'a': [0]},
             {'t': END + 0.75, 'm': 'title', 'a': []}]
    score = [{'calls': steer + score_calls(shots, KEEP), 'until': END}, {'calls': after}]

    return {'dur': DUR, 'shots': shots, 'overlay': overlay, 'end': (END, end), 'score': score,
            'mix': {'game': 1.0, 'drive': 2.0}}


def flash(size, k):
    from PIL import Image
    return Image.new('RGBA', size, (255, 255, 255, int(255 * max(0, min(1, k)))))
