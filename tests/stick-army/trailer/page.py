"""The page on the desk: a camera for Stick Army's play takes.

The game is one portrait notebook page centred on a desk. Its play takes are filmed at the page's own size
(trailer.json: 600 x 1080 at 2x, so 1200 x 2160 frames), and this puts the page back on the desk in a 1920 x 1080
picture, as the game itself shows it on a wide screen, so a push-in reads the page at up to twice its size, sharp.
"""
from PIL import Image

from cut import ease

DESK = (221, 214, 198)          # --desk in the game's CSS
PW, PH = 600, 1080              # the take's viewport, in CSS px


class Page:
    """zoom z0 -> z1 over `dur` (eased), aimed at (cx, cy) in the page's CSS px. The page is narrower than the frame
    until zoom 3.2, so a zoom crops its top and bottom: cy picks the band (sky or ground) and cx only counts past 3.2.
    At zoom 1 the whole page shows whatever (cx, cy) say, and the aim eases in as the zoom grows."""

    def __init__(self, z0=1.0, z1=1.0, cx=PW / 2, cy=PH / 2, dur=1.0, delay=0.0):
        self.z0, self.z1, self.cx, self.cy, self.dur, self.delay = z0, z1, cx, cy, dur, delay

    def at(self, u):
        z = self.z0 + (self.z1 - self.z0) * ease((u - self.delay) / self.dur)
        # how far toward the target the centre has moved: none at zoom 1, all of it by zoom 1.6
        k = min(1.0, max(0.0, (z - 1) / 0.6))
        cx = PW / 2 + (self.cx - PW / 2) * k
        cy = PH / 2 + (self.cy - PH / 2) * k
        # never past the page's top or bottom; and centred across until it's wider than the frame (from zoom 3.2),
        # then never past its sides (sliding a narrower page sideways would only bare the desk)
        cy = min(max(cy, 540 / z), PH - 540 / z)
        lo, hi = 960 / z, PW - 960 / z
        cx = PW / 2 if lo >= hi else min(max(cx, lo), hi)
        return z, cx, cy

    def compose(self, src, u):
        z, cx, cy = self.at(u)
        src = src.convert('RGB')
        ks = src.height / PH
        out = Image.new('RGB', (1920, 1080), DESK)
        x0, x1 = max(0.0, cx - 960 / z), min(PW, cx + 960 / z)
        y0, y1 = max(0.0, cy - 540 / z), min(PH, cy + 540 / z)
        w, h = round((x1 - x0) * z), round((y1 - y0) * z)
        part = src.resize((w, h), Image.LANCZOS, box=(x0 * ks, y0 * ks, x1 * ks, y1 * ks))
        out.paste(part, (round(960 + (x0 - cx) * z), round(540 + (y0 - cy) * z)))
        return out.convert('RGBA')
