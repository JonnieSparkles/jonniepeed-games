"""The co-op cut (make.py --cut coop): 26 s on its own march (music-coop.py), with two barrels. It follows the first
solo cut; the solo trailer has since grown to 36 s with the shop and the enemies, and this one hasn't yet.

0.00   the title's open notebook; then Play with a friend's link card: "Waiting for your friend…", "Your friend is
       here!" (the secret's three words are clicked off camera)
4.00   the drop: "Bring a friend." the blue barrel and the green one on one bunker, a catch over the mat;
       "Two barrels. One bunker."
8.00   the montage, both barrels firing: tanks, a helicopter, an air strike, heavy bombers, the night raid
16.00  the same tease: the final wave, the rumbling, "dreadnought!" and its bow just showing
22.00  the cover, and jonniepeed.games
"""
from cut import Cover, ease, fade, push
from page import Page
from shots import ev, at

# its own grid (the first cut's): 26 s at 120 BPM, on music-coop.py
BPM, B, BAR = 120, 0.5, 2.0
DROP, MONTAGE, TEASE, END, DUR = 4.0, 8.0, 16.0, 22.0, 26.0


def build(T, L, repo):
    C, A2, K2, N2, D2 = (T[k] for k in ('C', 'A2', 'K2', 'N2', 'D2'))
    title, card = C.windows[0][0], C.windows[1][0]
    join = card + 1.6                                     # the friend arrives 1.6 s into the card (takes.json)
    pop = ev(A2, 'ev:chute_pop:mat', 1)
    spawn, named = ev(D2, 'dread:spawn'), ev(D2, 'dread:named')

    shots = [
        (0.0, 2.0, C, title + 0.6, push(1.0, 1.08, 700, 520, 2.0)),
        (2.0, DROP, C, join - 1.2, push(1.45, 1.7, 640, 420, 2.0)),             # the link card; "Your friend is here!"
        # two barrels on one bunker, and a catch
        (DROP, DROP + BAR, A2, pop - 1.4, Page(1.5, 1.8, 430, 650, BAR)),
        (DROP + BAR, MONTAGE, A2, pop + 0.6, Page(1.8, 1.7, 380, 820, BAR)),      # "boing!", "recruit!", "squad full!"
        # the montage, both barrels firing
        (MONTAGE, MONTAGE + BAR, K2, at(K2, 9.5), Page(1.5, 1.7, 300, 330, BAR)),            # heavy bombers come in
        (MONTAGE + 2.0, MONTAGE + 3.0, K2, at(K2, 14.0), Page(1.7, 1.8, 300, 400, 1.0)),     # tanks on their chutes
        (MONTAGE + 3.0, MONTAGE + 4.0, K2, at(K2, 22.6), Page(1.7, 1.8, 330, 560, 1.0)),     # "chopper down!"
        (MONTAGE + 4.0, MONTAGE + 5.0, N2, at(N2, 3.0), Page(1.4, 1.5, 300, 600, 1.0)),      # night: a searchlight each
        (MONTAGE + 5.0, MONTAGE + 6.0, N2, at(N2, 12.5), Page(1.6, 1.7, 300, 330, 1.0)),     # heavy bombers in the dark
        (MONTAGE + 6.0, TEASE, N2, at(N2, 20.5), Page(1.3, 1.45, 300, 600, 2.0)),            # the two beams
        # the Dreadnought
        (TEASE, TEASE + 2.5, D2, spawn + 1.0, Page(2.0, 2.15, 330, 830, 2.5)),          # "What's that rumbling?"
        (TEASE + 2.5, END, D2, named - 0.6, Page(2.4, 3.0, 450, 380, END - TEASE - 2.5)),  # its name; its bow at the edge
    ]

    friend_l, two_l, pill = L('friend'), L('two'), L('pill')

    def note(im, layer, t, t0, t1):
        if t0 <= t < t1:
            im.alpha_composite(fade(layer, ease((t - t0) / 0.22) * (1 - ease((t - t1 + 0.2) / 0.2)), rise=10))

    def overlay(t, im):
        note(im, friend_l, t, DROP + 0.1, DROP + BAR)
        note(im, two_l, t, DROP + BAR + 0.1, MONTAGE + 1.0)
        return im

    cover = Cover(repo / 'brand/covers/stick-army.png', top=0, push=0.05, drift=6, dur=DUR - END)

    def end(u):
        im = cover.frame(u)
        k = ease((u - 0.8) / 0.4)
        if k > 0: im.alpha_composite(fade(pill, k, rise=14))
        return im

    return {'dur': DUR, 'shots': shots, 'overlay': overlay, 'end': (END, end),
            'mix': {'game': 0.55, 'music': 0.8, 'drive': 1.6}}
