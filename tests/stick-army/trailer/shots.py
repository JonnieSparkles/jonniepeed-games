"""The cut: 36 s on the trailer's own quickstep (music.py; the grid counts 2 s bars of four 0.5 s beats).

0.00   the title's open notebook: the logo, the orders on their post-it, the demo's plane and the pencil notes
4.00   the drop: "Pop chutes." a chute popped low over the mat; "Catch recruits." he bounces in and fills the squad
8.00   "Build your squad.": hiring a bazooka and a medic in the shop; the blue pen drawing in the sentry tower, the
       wire and the new hires as the next wave opens; promotions at the wave's end
14.00  "Upgrade your gun.": Spread shot packed in the shop, then its three-way volleys
18.00  "Know your enemy.": tanks, snipers, helicopters, dive bombers, heavy bombers, zeppelins and the night raid,
       one to a beat, each named in the enemy's red pen
26.00  a hit and the music all but stops: the final wave's rumbling; then the Dreadnought sailing in, blurred, a red
       CLASSIFIED stamp slammed on it, and "Defeat the Dreadnought." (Its name across the page says "the REAL enemy
       flagship", which would give away the decoy before it, so the shot starts after that has faded.)
32.00  the cover, and jonniepeed.games
"""
from PIL import Image, ImageDraw, ImageFilter

from cut import Cover, ease, fade, push
from page import Page, PW, PH

BPM, B, BAR = 120, 0.5, 2.0
DROP = 2 * BAR                  # 4
SQUAD = DROP + 2 * BAR          # 8
GUN = SQUAD + 3 * BAR           # 14
ENEMY = GUN + 2 * BAR           # 18
TEASE = ENEMY + 4 * BAR         # 26
STAMP = TEASE + 3.2             # the stamp lands (music.py hits it)
END = TEASE + 3 * BAR           # 32
DUR = END + 2 * BAR             # 36
L2P = 1.5                       # the game's logical px (400 x 720) to the take's CSS px (600 x 1080)


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


class Hidden(Page):
    """The Page camera with the Dreadnought blurred: its track (the director's dread:pos markers, in the game's
    logical px) says where the hull is in each frame, and a feathered box around it, masts and guns included, is
    blurred before the page is laid on the desk."""

    def __init__(self, take, src0, *a, **k):
        super().__init__(*a, **k)
        self.src0, self.track = src0, [m for m in take.marks if m['name'] == 'dread:pos']

    def ship(self, u):
        t = self.src0 + u
        return min(self.track, key=lambda m: abs(m['t'] - t))

    def compose(self, src, u):
        m = self.ship(u)
        src = src.convert('RGB')
        k = src.width / (PW / L2P)                                         # logical px to frame px
        x0, x1 = (m['x'] - m['hw'] - 26) * k, (m['x'] + m['hw'] + 26) * k
        y0, y1 = (m['y'] - m['hh'] - 64) * k, (m['y'] + m['hh'] + 48) * k
        box = tuple(int(v) for v in (max(0, x0), max(0, y0), min(src.width, x1), min(src.height, y1)))
        if box[2] > box[0]:
            part = src.crop(box).filter(ImageFilter.GaussianBlur(9))
            mask = Image.new('L', part.size, 0)
            ImageDraw.Draw(mask).rounded_rectangle((18, 18, part.width - 18, part.height - 18), radius=60, fill=255)
            src.paste(part, box[:2], mask.filter(ImageFilter.GaussianBlur(16)))
        return super().compose(src, u)

    def screen(self, u):
        """Where the visible part of the ship is on the trailer's frame."""
        m, (z, cx, cy) = self.ship(u), self.at(u)
        lx = (max(0, min(400, m['x'] - m['hw'])) + 400) / 2 if m['dir'] < 0 else (min(400, max(0, m['x'] + m['hw']))) / 2
        return 960 + (lx * L2P - cx) * z, 540 + (m['y'] * L2P - cy) * z


def build(T, L, repo):
    Tt, A, Z, K, N, Dd = (T[k] for k in ('T', 'A', 'Z', 'K', 'N', 'D'))
    pop = ev(A, 'ev:chute_pop:mat', 1)                 # the second catch: he fills the squad
    spawn, named = ev(Dd, 'dread:spawn'), ev(Dd, 'dread:named')

    S_ = T['S']
    shop8 = S_.windows[1][0]                           # the second shop's window: Spread shot
    hidden = Hidden(Dd, named + 3.4, 2.0, 2.25, 450, 400, END - TEASE - 2.5)

    shots = [
        (0.0, DROP, Tt, Tt.windows[0][0] + 1.0, push(1.0, 1.12, 700, 520, DROP)),      # the open notebook
        # pop and catch (the page is narrower than the frame, so a zoom only crops its top and bottom)
        (DROP, DROP + BAR, A, pop - 1.4, Page(1.5, 1.9, 440, 760, BAR)),          # the mat is on the right in this run
        (DROP + BAR, SQUAD, A, pop + 0.6, Page(1.9, 1.8, 380, 820, BAR)),         # "recruit!", "squad full!", "Ready!"
        # build your squad
        (SQUAD, SQUAD + BAR, S_, at(S_, 1.3), Page(2.1, 2.3, 300, 650, BAR)),             # hiring a bazooka, a medic
        (SQUAD + BAR, SQUAD + 2 * BAR, S_, at(S_, 6.3), Page(2.4, 2.6, 300, 860, BAR)),   # the pen draws them in
        (SQUAD + 2 * BAR, GUN, K, at(K, 31.5), Page(1.8, 1.9, 300, 600, BAR)),            # promotions
        # upgrade your gun
        (GUN, GUN + 1.5, S_, ev(S_, 'pick:spread') - 0.5, Page(2.3, 2.45, 300, 300, 1.5)),
        (GUN + 1.5, ENEMY, S_, shop8 + 5.0, Page(1.6, 1.75, 300, 560, 2.5)),             # three-way volleys
        # know your enemy, one to a beat pair
        (ENEMY, ENEMY + 1, K, at(K, 15.0), Page(1.7, 1.8, 300, 450, 1.0)),
        (ENEMY + 1, ENEMY + 2, K, at(K, 21.4), Page(2.0, 2.1, 300, 830, 1.0)),
        (ENEMY + 2, ENEMY + 3, Z, at(Z, 20.6), Page(1.8, 1.9, 300, 560, 1.0)),
        (ENEMY + 3, ENEMY + 4, K, at(K, 6.9), Page(1.6, 1.7, 300, 480, 1.0)),           # a dive bomber tipping over
        (ENEMY + 4, ENEMY + 5, K, at(K, 10.0), Page(1.6, 1.7, 300, 300, 1.0)),          # the olive four-engine bombers
        (ENEMY + 5, ENEMY + 6, Z, at(Z, 13.0), Page(1.5, 1.6, 300, 330, 1.0)),
        (ENEMY + 6, TEASE, N, at(N, 17.0), Page(1.3, 1.45, 300, 600, 2.0)),
        # the Dreadnought: rumbling, then sailing in, blurred and stamped
        (TEASE, TEASE + 2.5, Dd, spawn + 1.0, Page(2.0, 2.15, 330, 830, 2.5)),          # "What's that rumbling?"
        (TEASE + 2.5, END, Dd, named + 3.4, hidden),
    ]

    pop_l, catch_l, pill = L('pop'), L('catch'), L('pill')
    squad_l, gun_l, enemy_l, dread_l, stamp = L('squad'), L('gun'), L('enemy'), L('dread'), L('classified')
    labels = [L(n) for n in ('l-tanks', 'l-snipers', 'l-choppers', 'l-divers', 'l-heavies', 'l-zeps', 'l-night')]

    def note(im, layer, t, t0, t1, fin=0.22):
        if t0 <= t < t1:
            im.alpha_composite(fade(layer, ease((t - t0) / fin) * (1 - ease((t - t1 + 0.2) / 0.2)), rise=10))

    def slam(im, t):
        """The stamp: dropped on from a little bigger, at the ship's visible part, slightly smaller than the layer."""
        u = t - STAMP
        if u < 0: return
        k = 0.62 * (1 + 0.35 * (1 - ease(u / 0.12)))
        st = stamp.resize((int(1920 * k), int(1080 * k)), Image.LANCZOS)
        sx, sy = hidden.screen(t - (TEASE + 2.5))
        a = st.split()[3].point(lambda v: int(v * min(1, u / 0.06)))
        st.putalpha(a)
        im.alpha_composite(st, (int(sx - st.width / 2), int(sy - st.height / 2)))

    def overlay(t, im):
        note(im, pop_l, t, DROP + 0.1, DROP + BAR)
        note(im, catch_l, t, DROP + BAR + 0.1, SQUAD)
        note(im, squad_l, t, SQUAD + 0.1, SQUAD + 2 * BAR)
        note(im, gun_l, t, GUN + 0.1, ENEMY)
        note(im, enemy_l, t, ENEMY + 0.05, ENEMY + 2.0)
        for i, lab in enumerate(labels):
            note(im, lab, t, ENEMY + i + 0.05, ENEMY + i + (2.0 if i == 6 else 1.0), fin=0.12)
        slam(im, t)
        note(im, dread_l, t, STAMP + 0.35, END)
        return im

    cover = Cover(repo / 'brand/covers/stick-army.png', top=0, push=0.05, drift=6, dur=DUR - END)

    def end(u):
        im = cover.frame(u)
        k = ease((u - 0.8) / 0.4)
        if k > 0: im.alpha_composite(fade(pill, k, rise=14))
        return im

    return {'dur': DUR, 'shots': shots, 'overlay': overlay, 'end': (END, end),
            'mix': {'game': 0.55, 'music': 0.8, 'drive': 1.6}}
