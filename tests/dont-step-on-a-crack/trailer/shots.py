"""The cut: 15 s at 128 BPM (a beat is 0.469 s, a bar 1.875 s), written to the same grid as music.py.

0.00   Maple Ave, with the game's title lettered on the grass from the first frame (so a share preview says what
       it is): feet walk over the chalked title, Mom fine on the Mom Cam
1.41   cut on beat 3 as the glockenspiel plays "step on a", and "Step on a crack..." is written in; the foot lands
       on a crack on bar 2's downbeat (1.875) with "Crack. Mom's back." and the X-ray. "...break your mother's back."
3.75   montage, cut on the beat: heelies | Calzone herds you | Dad walks on Mom's back (a full bar,
       pushed in on the Mom Cam) | moon shoes | "Quarry Ln, condemned"
9.14   the last pothole lands on bar 6's downbeat (9.375); Mom calls, and the camera pushes in on the phone
11.25  end card: the cover art, with the studio mark and jonniepeed.games
"""
from cut import Cover, ease, fade, full, push, wipe

BPM, DUR = 128, 15.0
B = 60 / BPM
BAR = 4 * B


def build(T, L, repo):
    A, Bt, C = T['A'], T['B'], T['C']
    opening = A.mark('cap:open')
    hit = A.mark('breakVertebra', after='cap:crack')
    dad, herd = A.mark('startDad'), A.mark('herd')
    heel = Bt.mark('startPower:heelies')
    moonj = Bt.mark('beginJump', after='cap:moon')
    quarry = C.mark('street:4', after='cap:quarry')
    over, ring = C.mark('gameOver'), C.mark('showOver')
    FULL = full()

    T1 = 3 * B
    phone = ring - over + 0.235          # when the call appears, in the last shot's own time
    shots = [
        (0.0, T1, A, opening + 0.42, push(1.0, 1.03, 960, 540, T1)),
        (T1, BAR * 2, A, hit - (BAR - T1), push(1.0, 1.10, 900, 470, 0.6, delay=0.47)),
        (BAR * 2, BAR * 2 + B * 2, Bt, heel - 0.08, FULL),
        (BAR * 2 + B * 2, BAR * 3, A, herd - 0.40, FULL),
        (BAR * 3, BAR * 4, A, dad + 0.72, push(1.16, 4 / 3, 720, 405, BAR)),
        (BAR * 4, BAR * 4 + B * 2, Bt, moonj - 0.15, FULL),
        (BAR * 4 + B * 2, BAR * 5 - 0.235, C, quarry + 0.30, FULL),
        (BAR * 5 - 0.235, BAR * 6, C, over - 0.235, push(1.0, 4 / 3, 720, 405, 0.45, delay=phone - 0.05)),
    ]

    title, cap1, cap2, pill = L('title'), L('cap1'), L('cap2'), L('pill')

    def overlay(t, im):
        if t < T1:                                       # the title, whole on the first frame, gone before the cut
            im.alpha_composite(fade(title, 1 - ease((t - 0.95) / 0.3)))
        elif t < BAR * 2:                                # the rhyme, written in chalk
            im.alpha_composite(wipe(cap1, (t - T1) / 0.36, 1296, 1896))
            if t >= BAR + 0.22: im.alpha_composite(wipe(cap2, (t - BAR - 0.22) / 0.55, 1296, 1896))
        return im

    cover = Cover(repo / 'brand/covers/dont-step-on-a-crack.png', top=0, push=0.055, drift=8, dur=DUR - BAR * 6)

    def end(u):
        im = cover.frame(u)
        k = ease((u - 0.55) / 0.35)
        if k > 0: im.alpha_composite(fade(pill, k, rise=14))
        return im

    return {'dur': DUR, 'shots': shots, 'overlay': overlay, 'end': (BAR * 6, end),
            'mix': {'game': 0.9, 'music': 0.62, 'drive': 1.45}}
