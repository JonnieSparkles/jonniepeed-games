"""The cut: 26 s on the trailer's own march (120 BPM: a beat is 0.5 s, a bar 2 s), see music.py.

0.00   the title's open notebook: the logo, the orders on their post-it, the demo's plane and the pencil notes
4.00   the drop: "Pop chutes." a chute popped low over the mat; "Catch recruits." he bounces in and joins the squad
8.00   "Defend the notebook." cut on the beat: two zeppelins, tanks on their chutes, a helicopter's rope, an air
       strike, a dive bomber, heavy bombers, the night raid's searchlight
16.00  a hit, and the music all but stops: the final wave, the rumbling, searchlights reaching in from the edge,
       "dreadnought!" across the page and its bow just showing
22.00  the cover, and jonniepeed.games
"""
from cut import Cover, ease, fade, push
from page import Page

BPM, B, BAR = 120, 0.5, 2.0
DROP = 2 * BAR                  # 4
MONTAGE = DROP + 2 * BAR        # 8
TEASE = MONTAGE + 4 * BAR       # 16
END = TEASE + 3 * BAR           # 22
DUR = END + 2 * BAR             # 26


def ev(take, name, nth=0):
    """The nth marker `name` (or `name:...`) in the take's filmed windows (ff plays on off screen first)."""
    t0 = take.windows[0][0]
    hits = [m['t'] for m in take.marks if (m['name'] == name or m['name'].startswith(name + ':')) and m['t'] >= t0]
    if len(hits) <= nth:
        raise KeyError('take %s has no filmed marker %r #%d' % (take.name, name, nth))
    return hits[nth]


def at(take, t):
    """A moment picked from the take's contact sheet: t seconds into its first filmed window."""
    return take.windows[0][0] + t


def build(T, L, repo):
    Tt, A, Z, K, N, Dd = (T[k] for k in ('T', 'A', 'Z', 'K', 'N', 'D'))
    pop = ev(A, 'ev:chute_pop:mat', 1)                 # the second catch: he fills the squad
    spawn, named = ev(Dd, 'dread:spawn'), ev(Dd, 'dread:named')
    z_down = ev(Z, 'ev:plane_down:zeppelin')

    shots = [
        (0.0, DROP, Tt, Tt.windows[0][0] + 1.0, push(1.0, 1.12, 700, 520, DROP)),      # the open notebook
        # pop and catch (the page is narrower than the frame, so a zoom only crops its top and bottom)
        (DROP, DROP + BAR, A, pop - 1.4, Page(1.5, 1.9, 440, 760, BAR)),          # the mat is on the right in this run
        (DROP + BAR, MONTAGE, A, pop + 0.6, Page(1.9, 1.8, 380, 820, BAR)),       # "recruit!", "squad full!", "Ready!"
        # the montage, on the beat
        (MONTAGE, MONTAGE + BAR, Z, at(Z, 12.8), Page(1.5, 1.7, 300, 330, BAR)),            # two armored zeppelins
        (MONTAGE + 2.0, MONTAGE + 3.0, K, at(K, 15.0), Page(1.7, 1.8, 300, 450, 1.0)),      # tanks on their chutes
        (MONTAGE + 3.0, MONTAGE + 4.0, K, at(K, 22.3), Page(1.8, 1.9, 420, 760, 1.0)),      # a helicopter's rope
        (MONTAGE + 4.0, MONTAGE + 5.0, Z, z_down + 0.3, Page(1.6, 1.7, 260, 520, 1.0)),     # "zeppelin down!"
        (MONTAGE + 5.0, MONTAGE + 6.0, N, at(N, 9.6), Page(1.6, 1.7, 300, 330, 1.0)),       # heavy bombers in the dark
        (MONTAGE + 6.0, TEASE, N, at(N, 17.0), Page(1.3, 1.45, 300, 600, 2.0)),             # the night raid's searchlight
        # the Dreadnought: rumbling, searchlights from the edge, then its name and its bow
        (TEASE, TEASE + 2.5, Dd, spawn + 1.0, Page(2.0, 2.15, 330, 830, 2.5)),          # "What's that rumbling?"
        (TEASE + 2.5, END, Dd, named - 0.6, Page(2.4, 3.0, 450, 380, END - TEASE - 2.5)),  # its name; its bow at the edge
    ]

    pop_l, catch_l, defend_l, pill = L('pop'), L('catch'), L('defend'), L('pill')

    def note(im, layer, t, t0, t1):
        if t0 <= t < t1:
            im.alpha_composite(fade(layer, ease((t - t0) / 0.22) * (1 - ease((t - t1 + 0.2) / 0.2)), rise=10))

    def overlay(t, im):
        note(im, pop_l, t, DROP + 0.1, DROP + BAR)
        note(im, catch_l, t, DROP + BAR + 0.1, MONTAGE)
        note(im, defend_l, t, MONTAGE + 0.1, MONTAGE + 3.0)
        return im

    cover = Cover(repo / 'brand/covers/stick-army.png', top=0, push=0.05, drift=6, dur=DUR - END)

    def end(u):
        im = cover.frame(u)
        k = ease((u - 0.8) / 0.4)
        if k > 0: im.alpha_composite(fade(pill, k, rise=14))
        return im

    return {'dur': DUR, 'shots': shots, 'overlay': overlay, 'end': (END, end),
            'mix': {'game': 0.55, 'music': 0.8, 'drive': 1.6}}
