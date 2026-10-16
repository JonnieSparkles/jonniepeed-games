"""The cut: about 39 s on the RugCo Alley theme (120 BPM: a beat is 0.5 s, a bar 2 s), see music.py.

0.00   the 2025 title screen, tagged "2025", wipes to the remaster's title, tagged "Remastered"; "Let's go!"
6.00   the drop: "Now on mobile", the alley played on a phone's touch controls, in a phone held sideways
12.00  the polish up close: carpshits torn apart, muzzle flashes, the wave banners
16.00  the music stops, as it does in the game: the flash, the garage with its red light and embers, the Rugfather
       spinning out, the whole "Hello, Unruggabull."
23.30  FIGHT! The theme comes back at 1.5x, like the game plays it: fireballs and flaming carpets, cut before his
       spin-jump (the jump and the defeat after it read oddly at trailer speed)
29.30  "Race the clock. Earn the medals.": the end card's time, health and medals, then the board
33.30  as the 2025 trailer ends: the poster's last line, "...he was Unruggabull", "Goodbye, Rugfather.", and
       jonniepeed.games, the fight's music ringing out
"""
from PIL import Image, ImageDraw, ImageFilter

from cut import Cover, ease, fade, full, push

B, BAR = 0.5, 2.0
THEME_DROP = 21.35                  # the theme's full band comes in here (its beat grid: 0.35 + 0.5k)
WIPE = 2.1                          # 2025 -> remastered
DROP = 6.0
POLISH = DROP + 3 * BAR             # 12
BOSS = POLISH + 2 * BAR             # 16
FIGHT = BOSS + 7.3                  # 23.3: time for the lines to play out
FB = B / 1.5                        # a beat of the fight's music at 1.5x
CLEAR = FIGHT + 18 * FB             # 29.3
END = CLEAR + 4.0                   # 33.3
DUR = END + 4.0


class Phone:
    """A take filmed on a phone (2340 x 1080: 780 x 360 at 3x) shown in a phone held sideways, over a blurred,
    darkened copy of its own picture."""

    def __init__(self, push=(0.96, 1.0), dur=3.0, y=600, width=1560):
        self.push, self.dur, self.y, self.width = push, dur, y, width

    def compose(self, src, u):
        src = src.convert('RGB')
        bw = int(1080 * src.width / src.height)
        bg = src.resize((bw, 1080), Image.BILINEAR).crop(((bw - 1920) // 2, 0, (bw - 1920) // 2 + 1920, 1080))
        bg = Image.blend(bg.filter(ImageFilter.GaussianBlur(28)), Image.new('RGB', (1920, 1080), (8, 4, 4)), 0.55).convert('RGBA')
        k = self.push[0] + (self.push[1] - self.push[0]) * ease(u / self.dur)
        sw = int(self.width * k); sh = int(sw * src.height / src.width)
        bez = int(sw * 0.028)
        W, H = sw + 2 * bez, sh + 2 * bez
        body = Image.new('RGBA', (W + 60, H + 60), (0, 0, 0, 0))
        d = ImageDraw.Draw(body)
        d.rounded_rectangle((30, 46, 30 + W, 46 + H), radius=int(bez * 2.6), fill=(0, 0, 0, 150))       # shadow
        body = body.filter(ImageFilter.GaussianBlur(18))
        d = ImageDraw.Draw(body)
        d.rounded_rectangle((30, 30, 30 + W, 30 + H), radius=int(bez * 2.6), fill=(18, 18, 20, 255), outline=(70, 70, 76, 255), width=3)
        screen = src.resize((sw, sh), Image.LANCZOS)
        mask = Image.new('L', (sw, sh), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=int(bez * 1.6), fill=255)
        body.paste(screen, (30 + bez, 30 + bez), mask)
        cam = (30 + bez // 2, 30 + H // 2)                                                                  # the punch-hole camera
        ImageDraw.Draw(body).ellipse((cam[0] - 7, cam[1] - 7, cam[0] + 7, cam[1] + 7), fill=(6, 6, 8, 255))
        bg.alpha_composite(body, (960 - (W + 60) // 2, self.y - (H + 60) // 2))
        return bg


def build(T, L, repo, site=None):
    Tt, M, A, Bt = T['T'], T['M'], T['A'], T['B']
    lets = Tt.mark('say:lets-go')
    m_play, m_wave = M.mark('gs:playing'), M.mark('wave:4')
    a_kill = lambda n: A.mark('kill', after='gs:playing', nth=n)
    trig, garage, laugh, hello = Bt.mark('boss:trigger'), Bt.mark('say:garage'), Bt.mark('say:laugh'), Bt.mark('say:hello')
    battle, heat, shown = Bt.mark('boss:battle'), Bt.mark('say:heat'), Bt.mark('end:shown')
    FULL = full()

    shots = [
        (WIPE, DROP, Tt, lets - (DROP - 0.85 - WIPE), push(1.0, 1.04, 960, 540, DROP - WIPE)),       # "Let's go!" lands just before the drop
        # now on mobile
        (DROP, DROP + 3.0, M, m_play + 2.0, Phone(push=(0.95, 1.0), dur=3.0)),
        (DROP + 3.0, POLISH, M, m_wave - 1.4, Phone(push=(1.0, 1.04), dur=3.0)),
        # the polish, close
        (POLISH, POLISH + BAR, A, a_kill(5) - 0.9, push(1.15, 1.35, 960, 560, BAR)),
        (POLISH + BAR, BOSS, A, a_kill(24) - 1.0, push(1.0, 1.1, 960, 540, BAR)),
        # the Rugfather arrives
        (BOSS, BOSS + 1.4, Bt, trig + 0.05, FULL),
        (BOSS + 1.4, BOSS + 2.9, Bt, garage + 7.0, push(1.0, 1.15, 960, 500, 1.5)),
        (BOSS + 2.9, BOSS + 4.9, Bt, laugh + 6.0, push(1.1, 1.25, 1000, 600, 2.0)),
        (BOSS + 4.9, FIGHT, Bt, hello - 0.3, push(1.2, 1.4, 1200, 720, FIGHT - BOSS - 4.9)),
        # the fight
        (FIGHT, FIGHT + 8 * FB, Bt, battle - 0.1, FULL),
        (FIGHT + 8 * FB, FIGHT + 12 * FB, Bt, battle + 6.0, push(1.2, 1.3, 1200, 640, 4 * FB)),
        (FIGHT + 12 * FB, CLEAR, Bt, heat - 10.4, push(1.0, 1.12, 1100, 640, 6 * FB)),           # a fireball hits, well before the jump
        # the board
        (CLEAR, END, Bt, shown + 5.3, push(1.0, 1.03, 960, 540, END - CLEAR)),   # initials in, then the board with its medals
    ]

    old_tag, new_tag, mobile, board, pill = L('old'), L('new'), L('mobile'), L('board'), L('pill')
    old = Cover(repo / 'site/unruggabull-remastered/art/title.webp', top=0, push=0.03, drift=0, dur=WIPE)   # the 2025 title, from the gallery

    def opening(t):
        im = old.frame(t)
        im.alpha_composite(fade(old_tag, ease((t - 0.2) / 0.3)))
        return im

    def overlay(t, im):
        if WIPE <= t < WIPE + 0.35:                       # the 2025 title wipes away left to right, on a slant
            u = ease((t - WIPE) / 0.35)
            prev = opening(WIPE - 0.01)
            m = Image.new('L', im.size, 0)
            x = -400 + u * 2720
            ImageDraw.Draw(m).polygon([(x, 0), (2400, 0), (2400, 1080), (x - 400, 1080)], fill=255)
            im.paste(prev, (0, 0), m)
        if WIPE + 0.3 <= t < DROP - 0.4:
            im.alpha_composite(fade(new_tag, ease((t - WIPE - 0.3) / 0.25) * (1 - ease((t - DROP + 0.8) / 0.3))))
        if DROP + 0.1 <= t < POLISH:
            im.alpha_composite(fade(mobile, ease((t - DROP - 0.1) / 0.25) * (1 - ease((t - POLISH + 0.3) / 0.25)), rise=12))
        if CLEAR + 0.1 <= t < END:
            im.alpha_composite(fade(board, ease((t - CLEAR - 0.1) / 0.25), rise=12))
        return im

    # the 2025 poster, from the remaster's gallery (3/4 the 2025 file's size, so 2025's window at 1010 is 757 here)
    poster = Cover(pad_bottom(repo / 'site/unruggabull-remastered/art/gallery-he-was-unruggabull.webp', 90), top=757,
                   push=0.03, drift=0, dur=DUR - END)

    def end(u):
        im = poster.frame(u)
        k = ease((u - 1.2) / 0.4)
        if k > 0: im.alpha_composite(fade(pill, k, rise=14))
        return im

    return {'dur': DUR, 'open': (WIPE, opening), 'shots': shots, 'overlay': overlay, 'end': (END, end),
            'mix': {'game': 0.6, 'music': 0.85, 'drive': 1.6}}


def pad_bottom(path, px):
    """The poster with its dark grass carried on below the title, so the callout fits under the lettering (as 2025)."""
    im = Image.open(path).convert('RGB')
    strip = im.crop((0, im.height - 18, im.width, im.height)).filter(ImageFilter.GaussianBlur(22)).resize((im.width, px))
    out = Image.new('RGB', (im.width, im.height + px)); out.paste(im, (0, 0)); out.paste(strip, (0, im.height))
    return out
