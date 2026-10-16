"""The cut: the 2025 trailer's, shot for shot, with the remaster: 33 s on the RugCo Alley theme (120 BPM: a beat is
0.5 s, a bar 2 s), see music.py.

0.00   the remaster's title screen ("One bull was not like the rest, he was... Unruggabull"), over the theme's quiet
       intro; "Let's go!"
6.00   the drop: the alley, cut on the bar: carpshits unrugged, platforms, wave 4 ("Permanence"), wave 5
14.00  the music stops, as it does in the game: the flash and "Flawless victory", the garage with its red light and
       embers, the Rugfather spinning out, the whole "Hello, Unruggabull."
22.00  FIGHT! The theme comes back at 1.5x, like the game plays it: flaming carpets and fireballs, cut before his
       spin-jump ("Heat things up"), which reads oddly at trailer speed
29.00  end card, as 2025: the poster's last line, "...he was Unruggabull", "Goodbye, Rugfather.", and jonniepeed.games
"""
from PIL import Image, ImageFilter

from cut import Cover, ease, fade, full, push

B, BAR = 0.5, 2.0
THEME_DROP = 21.35                  # the theme's full band comes in here (its beat grid: 0.35 + 0.5k)
DROP = 6.0                          # ...lands here in the trailer
BOSS = DROP + 4 * BAR               # 14: the music stops for the boss's entrance
FIGHT = BOSS + 8.0                  # 22: time for the voice lines to play out
FB = B / 1.5                        # a beat of the fight's music, at 1.5x
END = FIGHT + 21 * FB               # 29
DUR = END + 4.0


def build(T, L, repo, site=None):
    Tt, A, Bt = T['T'], T['A'], T['B']
    lets = Tt.mark('say:lets-go')
    k = lambda n: A.mark('kill', after='gs:playing', nth=n)
    w4, w5 = A.mark('wave:4'), A.mark('wave:5')
    trig, garage, laugh, hello = Bt.mark('boss:trigger'), Bt.mark('say:garage'), Bt.mark('say:laugh'), Bt.mark('say:hello')
    battle, heat = Bt.mark('boss:battle'), Bt.mark('say:heat')
    FULL = full()

    shots = [
        (0.0, DROP, Tt, lets - (DROP - 0.85), push(1.0, 1.04, 960, 540, DROP)),           # "Let's go!" just before the drop
        # the drop: the alley
        (DROP, DROP + BAR, A, k(0) - 0.7, push(1.0, 1.06, 960, 560, BAR)),
        (DROP + BAR, DROP + 2 * BAR, A, k(8) - 0.9, FULL),
        (DROP + 2 * BAR, DROP + 3 * BAR, A, w4 - 1.0, FULL),                                # wave 4: "Permanence"
        (DROP + 3 * BAR, BOSS, A, w5 - 0.9, FULL),                                          # wave 5
        # the boss arrives, in silence: each line plays out
        (BOSS, BOSS + 2.2, Bt, trig + 0.05, FULL),                                         # the flash, "Flawless victory"
        (BOSS + 2.2, BOSS + 3.7, Bt, garage + 7.0, push(1.0, 1.15, 960, 500, 1.5)),        # the garage, red light and embers
        (BOSS + 3.7, BOSS + 5.6, Bt, laugh + 6.0, push(1.1, 1.25, 1000, 600, 1.9)),        # he spins out
        (BOSS + 5.6, FIGHT, Bt, hello - 0.3, push(1.2, 1.4, 1200, 720, FIGHT - BOSS - 5.6)),   # "Hello, Unruggabull."
        # the fight, at 1.5x, all before his spin-jump
        (FIGHT, FIGHT + 8 * FB, Bt, battle - 0.1, FULL),                                   # FIGHT! "...woven into a rug"
        (FIGHT + 8 * FB, FIGHT + 11 * FB, Bt, battle + 6.0, push(1.2, 1.3, 1200, 640, 3 * FB)),
        (FIGHT + 11 * FB, FIGHT + 17 * FB, Bt, heat - 21.2, push(1.0, 1.12, 1300, 760, 6 * FB)),   # flaming carpets
        (FIGHT + 17 * FB, END, Bt, heat - 10.0, FULL),                                     # a fireball hits
    ]

    pill = L('pill')
    # the 2025 poster, from the remaster's gallery (3/4 the 2025 file's size, so 2025's window at 1010 is 757 here)
    poster = Cover(pad_bottom(repo / 'site/unruggabull-remastered/art/gallery-he-was-unruggabull.webp', 90), top=757,
                   push=0.03, drift=0, dur=DUR - END)

    def end(u):
        im = poster.frame(u)
        k = ease((u - 1.2) / 0.4)
        if k > 0: im.alpha_composite(fade(pill, k, rise=14))
        return im

    return {'dur': DUR, 'shots': shots, 'end': (END, end), 'mix': {'game': 0.6, 'music': 0.85, 'drive': 1.6}}


def pad_bottom(path, px):
    """The poster with its dark grass carried on below the title, so the callout fits under the lettering (as 2025)."""
    im = Image.open(path).convert('RGB')
    strip = im.crop((0, im.height - 18, im.width, im.height)).filter(ImageFilter.GaussianBlur(22)).resize((im.width, px))
    out = Image.new('RGB', (im.width, im.height + px)); out.paste(im, (0, 0)); out.paste(strip, (0, im.height))
    return out
