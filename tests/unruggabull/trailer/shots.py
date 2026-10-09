"""The cut: about 31 s on the game's own RugCo Alley theme (120 BPM: a beat is 0.5 s, a bar 2 s), see music.py.

0.00   the title screen, "One bull was not like the rest...", over the theme's quiet intro; "Let's go!"
6.00   the drop: the alley, cut on the bar: carpshits unrugged, platforms, wave 4 ("Oh yeaaa"), wave 5
16.00  the music stops, as it does in the game: the white flash, the garage door opens, a laugh in the dark,
       "Hello, Unruggabull."
21.33  FIGHT! The theme comes back at 1.5x, like the game plays it: flaming carpets, "Heat things up", he burns
26.67  end card: the poster's last line, "...he was Unruggabull", "Goodbye, Rugfather.", and unruggabull.ar.io
"""
from cut import Cover, ease, fade, full, push

B, BAR = 0.5, 2.0
THEME_DROP = 21.35                  # where the theme's full band comes in (its beat grid: 0.35 + 0.5k)
DROP = 6.0                          # ...lands here in the trailer
BOSS = 16.0                         # the music stops for the boss's entrance
FIGHT = BOSS + 2 * BAR + BAR * 2 / 3   # 21.33: back on the grid, the fight's bars at 1.5x are 1.333 s
FB = BAR / 1.5
END = FIGHT + 4 * FB                # 26.67
DUR = END + 4.0


def build(T, L, repo, site=None):
    A, Bt = T['A'], T['B']
    play_a = A.mark('gs:playing')
    k = lambda n: A.mark('kill', after='gs:playing', nth=n)
    oh = A.mark('say:unruggabull-oh-yeaaaa')
    perm = A.mark('say:unruggabull-permanence')
    trig = Bt.mark('boss:trigger')
    door = Bt.mark('say:garage-door-opening')
    laugh = Bt.mark('say:rugfather-ha-ha-evil-echo-laugh')
    emerge = Bt.mark('say:unruggabull-oh-shit')
    hello = Bt.mark('say:rugfather-hello-unruggabull')
    battle = Bt.mark('boss:battle')
    heat = Bt.mark('say:rugfather-heat-things-up')
    dying = Bt.mark('boss:dying')
    FULL = full()

    shots = [
        # the drop: the alley
        (DROP, DROP + BAR, A, k(0) - 0.7, push(1.0, 1.06, 960, 560, BAR)),
        (DROP + BAR, DROP + 2 * BAR, A, k(8) - 0.9, FULL),
        (DROP + 2 * BAR, DROP + 3 * BAR, A, oh - 1.0, FULL),                   # wave 4: the flash, "Oh yeaaa"
        (DROP + 3 * BAR, DROP + 4 * BAR, A, k(26) - 0.6, push(1.08, 1.0, 960, 600, BAR)),
        (DROP + 4 * BAR, BOSS, A, perm - 0.9, FULL),                             # wave 5: "Permanence"
        # the boss arrives
        (BOSS, BOSS + 1.0, Bt, trig - 0.1, FULL),
        (BOSS + 1.0, BOSS + 2.5, Bt, door + 5.0, push(1.0, 1.15, 960, 520, 1.5)),   # the door rising
        (BOSS + 2.5, BOSS + 3.5, Bt, laugh - 0.2, push(1.6, 1.7, 960, 640, 1.0)),   # eyes in the dark
        (BOSS + 3.5, FIGHT, Bt, hello - 0.25, push(1.25, 1.4, 1240, 760, FIGHT - BOSS - 3.5)),
        # the fight, at 1.5x
        (FIGHT, FIGHT + FB, Bt, battle - 0.1, FULL),
        (FIGHT + FB, FIGHT + 2 * FB, Bt, battle + 4.0, FULL),
        (FIGHT + 2 * FB, FIGHT + 3 * FB, Bt, heat - 0.35, push(1.0, 1.12, 1300, 760, FB)),
        (FIGHT + 3 * FB, END, Bt, dying - 0.4, FULL),
    ]

    cap1, pill = L('cap1'), L('pill')
    title = Cover(site / 'assets/images/title-screen.png', top=0, push=0.035, drift=0, dur=DROP)
    poster = Cover(site / 'assets/gallery/he-was-unruggabull.png', top=960, push=0.03, drift=0, dur=DUR - END)

    def opening(t):
        im = title.frame(t)
        im.alpha_composite(fade(cap1, ease((t - 0.8) / 0.6) * (1 - ease((t - 4.4) / 0.5)), rise=12))
        if t > DROP - 0.25:                                    # a flash into the drop
            im.alpha_composite(white(im.size, ease((t - DROP + 0.25) / 0.25)))
        return im

    def overlay(t, im):
        if DROP <= t < DROP + 0.2:
            im.alpha_composite(white(im.size, 1 - ease((t - DROP) / 0.2)))
        return im

    def end(u):
        im = poster.frame(u)
        k = ease((u - 1.2) / 0.4)
        if k > 0: im.alpha_composite(fade(pill, k, rise=14))
        return im

    return {'dur': DUR, 'open': (DROP, opening), 'shots': shots, 'overlay': overlay, 'end': (END, end),
            'mix': {'game': 0.6, 'music': 0.85, 'drive': 1.6}}


def white(size, k):
    from PIL import Image
    return Image.new('RGBA', size, (255, 255, 255, int(255 * max(0, min(1, k)))))
