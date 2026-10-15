"""Draws Unruggabull for Unruggabull II and writes him to site/unruggabull-ii/bull.js as text grids.

He's a puppet of shaded shapes (head, hair, horns, neck, vest, arms, legs) posed in code, so a change to his
build, outfit or colours redraws every frame at once. Each pose is frozen into a grid: one character per pixel,
four tones per material, K for black outlines.

    python3 tools/unruggabull-ii/bull.py            writes site/unruggabull-ii/bull.js
    python3 tools/unruggabull-ii/bull.py --check    fails if bull.js is out of date with this script
    python3 tools/unruggabull-ii/bull.py --png DIR  also saves every frame as a PNG in DIR (needs Pillow)

The look (October 2026, picked over several rounds of mockups): muscular, with wide shoulders, a narrow waist and a
real neck; dark brown fur; a big warm-brown pompadour; clear glasses over half-lidded eyes; cream-to-gold horns; an
orange-tan snout; the red puffer vest open over a dark tee with charcoal sleeves; dog tags; jeans rolled at the ankle;
brown boots; a gold earring in his right ear; the gold blaster, and the katana on his back. Sized for a 480x270 hall
(about 70 px with the horns). Lit edges take a dark tone of their own colour; only edges turned away stay black.
"""
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'site/unruggabull-ii/bull.js'

# ---------- colours: four tones per material, dark to light, with cool shadows and warm lights ----------
MAT = {
    'fur':    ('abcd', ['20141a', '3a241f', '5a3a28', '7c5536']),
    'pomp':   ('efgh', ['2a140e', '4a2616', '70401f', '96602e']),
    'horn':   ('ijkl', ['6a3414', 'ad6a1c', 'e3a733', 'fff07e']),
    'ivory':  ('UVWX', ['8a6a3c', 'c4a670', 'ead6a6', 'fff8e4']),
    'vest':   ('mnop', ['561024', '981c24', 'cf362b', 'f7704b']),
    'tee':    ('qrst', ['1c1a24', '2c2a38', '403e52', '56546c']),   # charcoal sleeves: light grey read as shoulder pads from behind
    'navy':   ('1234', ['0e1224', '1a2036', '28304c', '3a4466']),
    'jean':   ('uvwx', ['141b3f', '1f336f', '2e4f95', '4a74b8']),
    'belt':   ('yzAB', ['1e1218', '38231c', '573a28', '7a5a3c']),
    'boot':   ('CDEF', ['2a140c', '4a2614', '6e3c20', '935a32']),
    'steel':  ('GHIJ', ['4e566a', '8a93a6', 'c4ccda', 'eef2fa']),
    'sheath': ('LMNO', ['0e0e16', '1c1c28', '30303e', '4a4a5a']),
    'snout':  ('QRST', ['6a2e1a', 'a44e26', 'd27a3c', 'f2a862']),
}
CHARS = {'K': '0a080d', 'P': 'fff4b0'}   # outline, and the blaster's lit muzzle
for _m, (_cs, _hx) in MAT.items():
    for _c, _h in zip(_cs, _hx):
        CHARS[_c] = _h

# ---------- proportions ----------
W, H = 80, 96          # the drawing box for one pose, with room around for a jump and a drawn katana
FEET = 94              # where his soles sit
CX = 40
SH = 15.8              # shoulder half-width at the delts
WAIST = 5.2            # waist half-width
LEG = 24               # hip to sole
TORSO = 18.5           # shoulders to belt
ARM = 1.1              # how thick his arms are
STANCE = 1.4           # how much further apart his feet are than his hips
HORN_GOLD = False      # True puts a gold band at the root of each horn (dropped: cream all the way reads cleaner)
FRONT_HORN = .72       # the horns' roots in the front view, thinner than from behind
CROUCH = 7.0           # crouched: how far he sinks, from behind and side on alike (SIDE_POSE's _C), so the two read as one crouch
HUNCH = 1.0            # crouched: how much shorter his back gets from behind (the side crouch leans forward a little)
DUCK_HEAD = .5         # crouched: how far his head dips toward his shoulders; the side crouch keeps it up
SLEEVE = 1.0           # how full the tee's sleeves and shoulder caps are
CAP = .8               # the shoulder caps on their own, a little slimmer
NECK = 6               # neck between the jaw and the collar
RX, RY = 6.6, 6.6      # the skull
LIT_ABOVE = FEET - 30  # side edges above this row (his waist) take a coloured outline; below it they stay black



# ---------- the canvas and its shapes ----------
class Canvas:
    def __init__(self, lit_above=LIT_ABOVE):
        self.mat = [[None] * W for _ in range(H)]
        self.tone = [[0.0] * W for _ in range(H)]
        self.part = [[0] * W for _ in range(H)]      # which shape drew each pixel, for inner lines
        self.line = [[False] * W for _ in range(H)]  # whether that shape wants a black inner line
        self.pid = 0
        self.hard = False
        self.force = {}                              # single pixels set by hand, applied last
        self.lit_above = lit_above

    def begin(self, hard=False):
        self.pid += 1
        self.hard = hard

    def put(self, x, y, mat, b):
        if 0 <= x < W and 0 <= y < H:
            self.mat[y][x] = mat
            self.tone[y][x] = b
            self.part[y][x] = self.pid
            self.line[y][x] = self.hard


def T(cv, x, y, c):
    cv.force[(int(x), int(y))] = c


def shade(nx, ny, base=0.0):
    # evenly lit from above and a little from the camera; the game adds the real light on top
    return 0.62 - 0.42 * ny - 0.28 * nx * nx + base


def h01(x, y):
    n = (x * 374761393 + y * 668265263) & 0xffffffff
    n = ((n ^ (n >> 13)) * 1274126177) & 0xffffffff
    return ((n ^ (n >> 16)) & 0xffff) / 65535


def ellipse(cv, cx, cy, rx, ry, mat, base=0.0, clip=None, hard=False):
    cv.begin(hard)
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            nx, ny = (x + .5 - cx) / rx, (y + .5 - cy) / ry
            if nx * nx + ny * ny <= 1 and (clip is None or clip(x, y)):
                cv.put(x, y, mat, shade(nx, ny, base))


def capsule(cv, pts, mat, base=0.0, hard=False):
    """A tube through points [(x, y, r), ...], shaded across its width."""
    cv.begin(hard)
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; rm = max(p[2] for p in pts)
    for y in range(int(min(ys) - rm - 1), int(max(ys) + rm + 2)):
        for x in range(int(min(xs) - rm - 1), int(max(xs) + rm + 2)):
            px, py = x + .5, y + .5
            best = None
            for (ax, ay, ar), (bx, by, br) in zip(pts, pts[1:]):
                dx, dy = bx - ax, by - ay
                L2 = dx * dx + dy * dy or 1e-9
                t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L2))
                qx, qy = ax + dx * t, ay + dy * t
                r = ar + (br - ar) * t
                d = math.hypot(px - qx, py - qy)
                if d <= r and (best is None or d / r < best[0]):
                    best = (d / r, (px - qx) / max(r, .01), (py - qy) / max(r, .01))
            if best:
                cv.put(x, y, mat, shade(best[1] * .9, best[2] * .9, base))


def poly(cv, pts, mat, base=0.0, hard=False, shade_fn=None):
    cv.begin(hard)
    ys = [p[1] for p in pts]; xs = [p[0] for p in pts]
    for y in range(int(min(ys)), int(max(ys)) + 1):
        for x in range(int(min(xs)), int(max(xs)) + 1):
            px, py = x + .5, y + .5
            inside = False
            for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
                if (ay > py) != (by > py) and px < ax + (bx - ax) * (py - ay) / (by - ay):
                    inside = not inside
            if inside:
                cv.put(x, y, mat, shade_fn(x, y) if shade_fn else 0.6 + base)


def tone_index(b):
    return 0 if b < .28 else 1 if b < .5 else 2 if b < .78 else 3


def finish(cv):
    """Shapes to characters, with inner lines and outlines. A lit edge (a top, or a side above LIT_ABOVE) takes the
    darkest tone of the material it bounds; undersides and lower sides stay black."""
    g = [['.'] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            m = cv.mat[y][x]
            if m:
                g[y][x] = MAT[m][0][tone_index(cv.tone[y][x])]
    for y in range(H):
        for x in range(W):
            m = cv.mat[y][x]
            if not m:
                continue
            p = cv.part[y][x]
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < W and 0 <= yy < H and cv.mat[yy][xx] and cv.part[yy][xx] < p and (cv.mat[yy][xx] != m or cv.line[y][x]):
                    g[y][x] = 'K' if cv.line[y][x] else MAT[m][0][0]
                    break
    out = [row[:] for row in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] != '.':
                continue
            for dx, dy in ((0, 1), (1, 0), (-1, 0), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < W and 0 <= yy < H and g[yy][xx] != '.':
                    m = cv.mat[yy][xx]
                    lit = dy == 1 or (dx != 0 and yy < cv.lit_above)
                    out[y][x] = MAT[m][0][0] if (lit and m and m not in ('pomp', 'sheath')) else 'K'
                    break
    for (x, y), c in cv.force.items():
        if 0 <= x < W and 0 <= y < H:
            out[y][x] = c
    return out


def tex_y(y):
    # texture is anchored to his feet, so a taller or shorter box doesn't reshuffle it
    return y - FEET + 70


def tex_x(x):
    return x - CX + 32


def furtex(cv):
    # short strands: fur tones broken up in 1x2 dabs
    for y in range(H):
        for x in range(W):
            if cv.mat[y][x] == 'fur':
                cv.tone[y][x] += (h01(tex_x(x), tex_y(y) // 2) - .5) * .16


def curls(cv):
    # a soft curly texture in the hair
    for y in range(H):
        for x in range(W):
            if cv.mat[y][x] == 'pomp':
                n = h01(tex_x(x) // 2 + 31, tex_y(y) // 2 + 7)
                cv.tone[y][x] += .16 if n > .72 else -.14 if n < .2 else 0


# ---------- parts ----------
def earring(cv, ex, ey):
    for dx, dy, c in ((-1, 0, 'l'), (1, 0, 'k'), (-1, 1, 'k'), (1, 1, 'j'), (0, 2, 'j')):
        T(cv, ex + dx, ey + dy, c)


def horn(cv, pts):
    # cream, ridged near the head (with HORN_GOLD, gold at the root)
    capsule(cv, pts[:3], 'horn' if HORN_GOLD else 'ivory', base=.12)
    capsule(cv, pts[2:], 'ivory', base=.14)
    for k in (.12, .26):
        (ax, ay, _), (bx, by, _) = pts[0], pts[1]
        T(cv, ax + (bx - ax) * k * 3, ay + (by - ay) * k * 3, 'i' if HORN_GOLD else 'U')
    tx, ty, _ = pts[-2]
    T(cv, tx, ty - 1, 'X')


def horn_pts(hx, hy, s, base=1.0):
    # out to the side, then up: s is -1 for his left (our left from behind), 1 for his right. base thins the root.
    return [(hx, hy, 2.6 * base), (hx + 4.6 * s, hy - .3, 2.4 * (1 + base) / 2), (hx + 7.8 * s, hy - 3.2, 2.0), (hx + 8.8 * s, hy - 7.4, 1.5), (hx + 8.0 * s, hy - 10.6, .9)]


def fist(cv, hx, hy, r):
    # the back of a fist: a lit top, two creases between the fingers
    ellipse(cv, hx, hy, r, r * .95, 'fur', base=.2, hard=True)
    T(cv, hx - r * .35, hy + r * .35, 'a'); T(cv, hx + r * .35, hy + r * .35, 'a')
    T(cv, hx, hy - r * .55, 'd'); T(cv, hx - 1, hy - r * .55, 'd')


def arm(cv, sh, el, hd, fist_r):
    # shoulder, a bulging upper arm in a grey sleeve, elbow, a thick forearm, the fist
    m1 = (sh[0] + (el[0] - sh[0]) * .5, sh[1] + (el[1] - sh[1]) * .5)
    m2 = (el[0] + (hd[0] - el[0]) * .4, el[1] + (hd[1] - el[1]) * .4)
    k = ARM
    capsule(cv, [(sh[0], sh[1], 2.9 * k), (m1[0], m1[1], 2.9 * k), (el[0], el[1], 2.0 * k), (m2[0], m2[1], 2.4 * k), (hd[0], hd[1], 1.8 * k)], 'fur', base=.12, hard=True)
    ex, ey = sh[0] + (el[0] - sh[0]) * .38, sh[1] + (el[1] - sh[1]) * .38
    capsule(cv, [(sh[0], sh[1], 3.4 * k * SLEEVE), (ex, ey, 3.1 * k * SLEEVE)], 'tee', base=.02, hard=True)
    fist(cv, hd[0], hd[1], fist_r * k)


def delt(cv, x, y, side):
    ellipse(cv, x + side * (SH - 2.6), y + 2.6, 3.3 * ARM * SLEEVE * CAP, 3.2 * ARM * SLEEVE * CAP, 'tee', base=.12, hard=True)


def traps(cv, x, y):
    # a thick neck sloping down to the shoulders, lit along the top
    cv.begin()
    for py in range(int(y), int(y + 7)):
        t = (py - y) / 6
        hw = 4.8 + t * 8.8
        for px in range(int(x - hw), int(x + hw) + 1):
            cv.put(px, py, 'fur', shade((px + .5 - x) / hw * .8, -.5 + t * .6, .08))
    for px in range(int(x - 11), int(x + 12)):
        u = abs(px + .5 - x)
        if u > 4.5:
            T(cv, px, y + (u - 4.8) / 8.8 * 6, 'd')


def neck_back(cv, x, y):
    # the neck from behind: a column of fur from under the skull down into the traps
    cv.begin()
    top = y - NECK - 1
    for py in range(int(top), int(y + 3)):
        t = (py - top) / (y + 3 - top)
        hw = 4.4 + t * 1.6
        for px in range(int(x - hw), int(x + hw) + 1):
            cv.put(px, py, 'fur', shade((px + .5 - x) / hw * .9, t * .6 - .3, .06))


def cuff(cv, bx, by):
    # jeans rolled at the ankle
    ellipse(cv, bx, by - .6, 3.3, 1.3, 'jean', base=.32)
    for px in range(int(bx - 3), int(bx + 4)):
        T(cv, px, by - 2, 'u')


def quilt_sheen(cv, x, y0, y1, hw_at, gap=0):
    # a highlight on each quilted band of the vest
    for k in range(5):
        by = int(y0 + 2.6 + k * 4.4)
        if by >= y1 - 1:
            break
        hw = hw_at(by)
        for s in (-1, 1):
            cx = x + s * (gap + (hw - gap) * .45)
            T(cv, cx, by, 'p'); T(cv, cx + s, by, 'p')


def tail(cv, x, y, sway=0, n=8):
    k = n / 9
    capsule(cv, [(x + .5, y, 1.0), (x - .8 + sway * .5, y + 5 * k, .9), (x - 1.3 + sway, y + 9 * k, .9)], 'fur', base=.12)
    ellipse(cv, x - 1.4 + sway, y + 10.4 * k, 1.8, 2.0, 'fur', base=.0)


def hilt(cv, gx, gy, ex, ey, rg=1.9):
    # the katana's hilt: a dark cord-wrapped grip from its gold guard (gx, gy) to a small gold cap (ex, ey). Only the
    # guard and the cap are gold, so from the front it can't run into his earring.
    capsule(cv, [(gx, gy, 1.0), (ex, ey, 1.0)], 'sheath', base=.1, hard=True)
    for t in (.35, .65):
        T(cv, gx + (ex - gx) * t, gy + (ey - gy) * t, 'O')
    ellipse(cv, gx, gy, rg, rg * .85, 'horn', base=-.1, hard=True)
    T(cv, ex, ey, 'k')


def katana_back(cv, x, y):
    # sheathed across his back: the tip low on his left, the hilt over his right shoulder
    a, b, c = (x - 8, y + 14), (x + 5, y - 1.5), (x + 8.2, y - 6)
    capsule(cv, [(a[0], a[1], 1.15), (b[0], b[1], 1.15)], 'sheath', hard=True)
    hilt(cv, b[0], b[1], c[0], c[1])


def katana_held(cv, hx, hy, tx, ty):
    d = math.hypot(tx - hx, ty - hy); ux, uy = (tx - hx) / d, (ty - hy) / d
    capsule(cv, [(hx - ux * 3.5, hy - uy * 3.5, 1.0), (hx + ux * .5, hy + uy * .5, 1.0)], 'sheath', base=.1, hard=True)
    T(cv, hx - ux * 3.5, hy - uy * 3.5, 'k')
    capsule(cv, [(hx + ux * 1.6, hy + uy * 1.6, 1.15), (tx, ty, .7)], 'steel', base=.18, hard=True)
    ellipse(cv, hx + ux * 1.2, hy + uy * 1.2, 1.6, 1.6, 'horn', base=-.1, hard=True)


def blaster_back(cv, hx, hy):
    # the blaster from behind, held up: a gold block with its lit muzzle (P) facing away
    poly(cv, [(hx - 3.5, hy - 7.5), (hx + 3.5, hy - 7.5), (hx + 3.5, hy - .5), (hx - 3.5, hy - .5)], 'horn', hard=True,
         shade_fn=lambda px, py: shade((px + .5 - hx) / 4, (py - hy + 4) / 4, .1))
    for px in range(int(hx - 1), int(hx + 2)):
        for py in range(int(hy - 6), int(hy - 3)):
            cv.force[(px, py)] = 'P' if (px == int(hx) or py == int(hy - 5)) else 'l'
    for px in range(int(hx - 3), int(hx + 4)):
        cv.force[(px, int(hy - 1))] = 'i'


# ---------- from behind: the poses the game uses ----------
def head_back(cv, x, y, look=0):
    cy = y + 11.2
    if look:   # head turned: the tip of his snout shows past his cheek
        ellipse(cv, x + look * (RX + .6), cy + 3.4, 2.4, 1.8, 'snout', base=.1, hard=True)
    for s in (-1, 1):
        horn(cv, horn_pts(x + s * RX * .72, y + 8.2, s))
    for s in (-1, 1):
        ellipse(cv, x + s * (RX + 1.3), y + 11.6, 3.3, 1.7, 'fur', base=.2, hard=True)
    cv.begin(True)
    for py in range(int(cy - RY - 1), int(cy + RY + 2)):
        v = (py + .5 - cy) / RY
        if abs(v) > 1:
            continue
        t = (v + 1) / 2
        w = RX * math.sqrt(1 - v * v) ** .9 * (1.1 - .26 * t)
        for px in range(int(x - w - 1), int(x + w + 2)):
            u = (px + .5 - x) / max(w, .1)
            if abs(u) <= 1:
                cv.put(px, py, 'fur', shade(u, v * .9, .16))
    # the pompadour from behind: a big rounded mass, swept down into a ducktail at the nape
    cv.begin(True)
    for py in range(int(y - 2), int(cy + 4)):
        for px in range(int(x - RX - 2), int(x + RX + 3)):
            u = (px + .5 - x) / (RX * 1.06)
            if py + .5 < y + 6.5:
                v = (py + .5 - y - 4.4) / 5.4
                inside = u * u + v * v <= 1
            else:
                uu, v = (px + .5 - x) / (RX * 1.06), (py + .5 - cy) / RY
                inside = uu * uu + v * v <= 1 and (py + .5) < cy + 3.6 - abs(uu) * 4.0
            if inside:
                cv.put(px, py, 'pomp', shade(u * .8, (py - y - 5) / 9, .14) - (.2 if abs(px + .5 - x) < .9 and py > y + 4 else 0))
    curls(cv)
    for s in (-1, 1):
        T(cv, x + s * (RX + .4), cy - 1.6, 'L'); T(cv, x + s * (RX + 1.2), cy - 1.4, 'L')   # the glasses' arms
    earring(cv, x + RX + 3.6, cy + 2.0)                                                 # his right ear: our right from behind


def torso_back(cv, x, y, h):
    # the vest from behind: a V from the shoulders to the waist, quilted in bands
    cv.begin()
    top_w = SH - 2.2
    for py in range(int(y), int(y + h) + 1):
        t = max(0.0, (py - y) / h)
        hw = WAIST + (top_w - WAIST) * (1 - t) ** 1.8
        for px in range(int(x - hw), int(x + hw) + 1):
            u = (px + .5 - x) / hw
            band = ((py - y - 2) % 4.4) / 4.4
            cv.put(px, py, 'vest', shade(u, (band - .45) * 1.2, .04) if py - y >= 2 else shade(u, -.6, .05))
    for k in range(1, 6):
        sy = int(y + 2 + k * 4.4 - .5)
        if sy >= y + h:
            break
        for px in range(W):
            if cv.mat[sy][px] == 'vest' and cv.part[sy][px] == cv.pid:
                cv.tone[sy][px] = .1
    ellipse(cv, x, y + .5, 5.6, 1.5, 'vest', base=-.15, clip=lambda px, py: py >= y)


def legs_back(cv, x, y, L):
    poly(cv, [(x - WAIST - .4, y), (x + WAIST + .4, y), (x + WAIST + .2, y + 4), (x - WAIST - .2, y + 4)], 'jean', shade_fn=lambda px, py: shade((px + .5 - x) / 9, -.2, 0))
    for (kx, ky, fx, fy, sole), side in ((L[0], -1), (L[1], 1)):
        capsule(cv, [(x + (3.2 + STANCE * .3) * side, y + 2, 3.2), (x + kx, y + ky, 2.7), (x + fx, y + fy, 2.5)], 'jean', base=-.02)
    for (kx, ky, fx, fy, sole), side in ((L[0], -1), (L[1], 1)):
        bx, by = x + fx, y + fy
        if sole:   # a foot kicked up behind him: the sole toward the camera
            ellipse(cv, bx, by + 1.2, 3.6, 2.6, 'boot', base=-.04)
            poly(cv, [(bx - 3, by + 2.6), (bx + 3, by + 2.6), (bx + 2.4, by + 4.2), (bx - 2.4, by + 4.2)], 'boot', shade_fn=lambda px, py: .2)
        else:      # the heel of a boot
            poly(cv, [(bx - 2.8, by), (bx + 2.8, by), (bx + 3.3, by + 4.2), (bx + 3.1, by + 5.4), (bx - 3.1, by + 5.4), (bx - 3.3, by + 4.2)], 'boot',
                 shade_fn=lambda px, py, bx=bx, by=by: shade((px + .5 - bx) / 4.2, (py - by - 1.5) / 3.5, .04))
            for px in range(int(bx - 3), int(bx + 4)):
                T(cv, px, by + 4, 'C')
    for (kx, ky, fx, fy, sole) in L:
        if not sole:
            cuff(cv, x + fx, y + fy)


# Each pose: legs, left arm, right arm, and extras (bob moves his body down, look turns his head, lift raises the
# katana in its sheath, spin turns the blaster on his finger). Arms and legs are named in build_pose.
POSE = {
    'stand':      ('stand', 'down', 'down', {}),
    'breathe':    ('stand', 'down', 'down', {'bob': 1}),
    'runA':       ('runA', 'fwd', 'back', {}),
    'runB':       ('runB', 'back', 'fwd', {}),
    'jump':       ('jump', 'up', 'up', {}),
    'crouch':     ('crouch', 'crouch', 'crouch', {}),
    'crouchWalkA': ('crouchA', 'crouch', 'crouch', {}),   # a low shuffle, for when the hall carries him along crouched
    'crouchWalkB': ('crouchB', 'crouch', 'crouch', {}),
    'aim':        ('stand', 'down', 'aim', {}),
    'kick':       ('stand', 'down', 'kick', {'bob': 1}),
    'runAimA':    ('runA', 'fwd', 'aim', {}),
    'runAimB':    ('runB', 'back', 'aim', {}),
    'jumpAim':    ('jump', 'up', 'aim', {}),
    'wind':       ('stand', 'down', 'wind', {}),
    'slash':      ('stand', 'fwd', 'slash', {}),
    'jumpWind':   ('jump', 'up', 'wind', {}),
    'jumpCut':    ('jump', 'up', 'slash', {}),
    'crouchAim':  ('crouch', 'crouch', 'aim', {}),   # crouched and shooting: the blaster up beside his head, as in the aim pose, a crouch lower
    'crouchWind': ('crouch', 'crouch', 'wind', {}),
    'crouchCut':  ('crouch', 'fwd', 'slash', {}),
    'hurt':       ('stand', 'flinch', 'flinch', {'bob': 1}),
    'lookL':      ('stand', 'down', 'down', {'look': -1}),
    'lookR':      ('stand', 'down', 'down', {'look': 1}),
    'twirl0':     ('stand', 'down', 'twirl', {'spin': 0}),
    'twirl1':     ('stand', 'down', 'twirl', {'spin': 1}),
    'twirl2':     ('stand', 'down', 'twirl', {'spin': 2}),
    'twirl3':     ('stand', 'down', 'twirl', {'spin': 3}),
    'grip':       ('stand', 'down', 'grip', {}),
    'gripUp':     ('stand', 'down', 'grip', {'lift': 2}),
    'scuff':      ('scuff', 'down', 'down', {}),
    'win':        ('stand', 'horns', 'horns', {}),
    'winB':       ('stand', 'horns', 'horns', {'bob': -1}),
}


def blaster_spin(cv, hx, hy, k):
    # the blaster from the side, turning on his finger: a gold barrel out from the hand, a short grip, the lit muzzle.
    # k is the quarter turn: 0 points right, 1 up, 2 left, 3 down.
    a = (0, -math.pi / 2, math.pi, math.pi / 2)[k % 4]
    ux, uy = math.cos(a), math.sin(a)
    px_, py_ = -uy, ux                     # across the barrel
    capsule(cv, [(hx - px_ * 1.6, hy - py_ * 1.6, 1.3), (hx - px_ * 3.6 - ux * .8, hy - py_ * 3.6 - uy * .8, 1.2)], 'belt', base=.1, hard=True)
    capsule(cv, [(hx - ux * 1.2, hy - uy * 1.2, 2.0), (hx + ux * 6.4, hy + uy * 6.4, 1.4)], 'horn', base=.16, hard=True)
    ellipse(cv, hx + ux * 7.2, hy + uy * 7.2, 1.3, 1.3, 'ivory', base=.12, hard=True)
    cv.force[(int(hx + ux * 7.6), int(hy + uy * 7.6))] = 'P'


def horns_up(cv, hx, hy):
    # index and little finger raised over the fist
    for s in (-1, 1):
        capsule(cv, [(hx + s * 1.7, hy - 1.6, 1.0), (hx + s * 2.2, hy - 5.6, .9)], 'fur', base=.22, hard=True)


def build_pose(name):
    legs, larm, rarm, ex = POSE[name]
    cv = Canvas()
    x, bob = CX, ex.get('bob', 0)
    Lk, Lf = LEG * .42, LEG * .72
    st, sk = STANCE, STANCE * .6   # the stance, at the feet and at the knees
    legs_p = ((-3.6 - sk, Lk, -3.8 - st, Lf, False), (3.6 + sk, Lk, 3.8 + st, Lf, False))
    tsway, tl = 0, 8
    if legs == 'runA':
        bob -= 1; legs_p = ((-4.0 - sk, Lk * .9, -3.8 - st, Lf, False), (3.8 + sk, LEG * .3, 4.0 + sk, LEG * .4, True)); tsway = -1
    if legs == 'runB':
        legs_p = ((-3.8 - sk, LEG * .3, -4.0 - sk, LEG * .4, True), (4.0 + sk, Lk * .9, 3.8 + st, Lf, False)); tsway = 1
    if legs == 'jump':
        bob -= 9; legs_p = ((-6.2, LEG * .28, -5.4, LEG * .42, True), (6.2, LEG * .28, 5.4, LEG * .42, True)); tsway, tl = -2, 6
    # crouched: the side crouch's depth (CROUCH) with the same bent legs, seen from behind: hips down, feet planted where
    # they were, knees out a little and forward (so a little lower than half way)
    cfy = Lf - CROUCH
    if legs == 'crouch':
        bob += CROUCH; legs_p = ((-8.0, cfy * .5, -6.4, cfy, False), (8.0, cfy * .5, 6.4, cfy, False)); tl = 4
    if legs in ('crouchA', 'crouchB'):   # a crouched shuffle: one boot lifted and stepping in, the body rocking onto the other
        sd = -1 if legs == 'crouchA' else 1
        bob += CROUCH - .6
        lift = lambda k: (k * 7.0, cfy * .5 - 1.8, k * 4.6, cfy - 2.2, False)   # the boot a couple of pixels up and in
        plant = lambda k: (k * 8.8, cfy * .5 + .5, k * 7.0, cfy + .6, False)    # the body is .6 higher, so this boot still ends at FEET
        legs_p = (lift(-1) if sd < 0 else plant(-1), lift(1) if sd > 0 else plant(1)); tl = 4; tsway = -sd
    if legs == 'scuff':   # the right hoof lifted and scraped back, his weight on the left
        legs_p = ((-3.6 - sk, Lk, -3.8 - st, Lf, False), (3.8 + sk, Lk * .95, 4.4 + st, Lf - 4.0, True)); tsway = 1
    crouch = legs in ('crouch', 'crouchA', 'crouchB')
    hipy = FEET - Lf - 5.4 + bob
    hunch = HUNCH if crouch else 0   # crouched, he hunches over: a shorter back, his head down into his shoulders
    vy = hipy - TORSO + hunch

    legs_back(cv, x, hipy, legs_p)
    torso_back(cv, x, vy + (1 if crouch and not hunch else 0), TORSO - hunch - (1 if crouch and not hunch else 0))
    poly(cv, [(x - WAIST, hipy - 1.5), (x + WAIST, hipy - 1.5), (x + WAIST, hipy - .5), (x - WAIST, hipy - .5)], 'navy', shade_fn=lambda px, py: .55)
    poly(cv, [(x - WAIST - .4, hipy - .5), (x + WAIST + .4, hipy - .5), (x + WAIST + .4, hipy + 1.5), (x - WAIST - .4, hipy + 1.5)], 'belt', shade_fn=lambda px, py: .6 if py == int(hipy - .5) else .4)
    tail(cv, x, hipy + 1.5, tsway, tl)
    traps(cv, x, vy - 5)
    neck_back(cv, x, vy - 5)
    for s in (-1, 1):
        delt(cv, x, vy - 1.5, s)
    head_back(cv, x + ex.get('look', 0) * 1.5, vy - 18 - NECK + (DUCK_HEAD if crouch else 0), ex.get('look', 0))
    drawn = rarm in ('wind', 'slash')
    lift = ex.get('lift', 0)
    if not drawn:
        katana_back(cv, x + lift * .4, vy + 3 - lift)
    sy = vy + 1.5
    ls, rs = (x - SH + 2.4, sy), (x + SH - 2.4, sy)
    o = SH - 10.6
    s0 = SH - 2.4   # how far out his shoulder joints are; arms hang just outside them, by his sides
    A = {
        'down':   {'L': ((x - s0 - .6, vy + 9.5), (x - s0 + .4, vy + 16.5)), 'R': ((x + s0 + .6, vy + 9.5), (x + s0 - .4, vy + 16.5))},
        'fwd':    {'L': ((x - s0 - .4, vy + 9.5), (x - s0 + 1.4, vy + 14)), 'R': ((x + s0 + .4, vy + 9.5), (x + s0 - 1.4, vy + 14))},
        'back':   {'L': ((x - s0 - 1.2, vy + 10), (x - s0 - 1.6, vy + 17.5)), 'R': ((x + s0 + 1.2, vy + 10), (x + s0 + 1.6, vy + 17.5))},
        'up':     {'L': ((x - 16.4 - o, vy - 1), (x - 18.5 - o, vy - 7.5)), 'R': ((x + 16.4 + o, vy - 1), (x + 18.5 + o, vy - 7.5))},
        'horns':  {'L': ((x - 16.0 - o, vy - 2), (x - 17.0 - o, vy - 9.5)), 'R': ((x + 16.0 + o, vy - 2), (x + 17.0 + o, vy - 9.5))},
        'flinch': {'L': ((x - s0 - 3.6, vy + 3.5), (x - s0 - 1.8, vy - 3.5)), 'R': ((x + s0 + 3.6, vy + 3.5), (x + s0 + 1.8, vy - 3.5))},
        'crouch': {'L': ((x - s0 - .8, vy + 9), (x - s0 + 1.0, vy + 14.5)), 'R': ((x + s0 + .8, vy + 9), (x + s0 - 1.0, vy + 14.5))},   # hanging forward, as the side crouch carries them
        'aim':    {'R': ((x + 15.2 + o, vy + 4.0), (x + 16.6 + o, vy - 2.6))},
        'kick':   {'R': ((x + 15.6 + o, vy + 2.4), (x + 15.4 + o, vy - 5.0))},
        'wind':   {'R': ((x + 16.0 + o, vy - 2.5), (x + 15.0 + o, vy - 9.5))},
        'slash':  {'R': ((x + 17.0 + o, vy + .5), (x + 22.0 + o, vy + 0))},
        'twirl':  {'R': ((x + s0 + 1.6, vy + 9.0), (x + s0 + 4.2, vy + 14.5))},
        'grip':   {'R': ((x + s0 + 2.4, vy - 7.5 - lift), (x + 7.4 + lift * .4, vy - 1.8 - lift))},
    }
    for side, sh in (('L', ls), ('R', rs)):
        key = larm if side == 'L' else rarm
        el, hd = A[key][side]
        arm(cv, sh, el, hd, 2.9)
        if key == 'horns':
            horns_up(cv, hd[0], hd[1])
        if side == 'R' and key in ('aim', 'kick'):
            blaster_back(cv, hd[0], hd[1] - 1.6)
        if side == 'R' and key == 'twirl':
            blaster_spin(cv, hd[0] + .4, hd[1] + 1.6, ex['spin'])
        if side == 'R' and key == 'wind':
            katana_held(cv, hd[0], hd[1], hd[0] - 8, hd[1] - 15)
        if side == 'R' and key == 'slash':
            katana_held(cv, hd[0], hd[1], hd[0] + 12, hd[1] - 6)
    furtex(cv)
    return finish(cv)


# ---------- the turnaround: front and side (the back is the stand pose) ----------
def boot_front(cv, bx, by):
    poly(cv, [(bx - 2.8, by), (bx + 2.8, by), (bx + 3.4, by + 3.4), (bx + 3.3, by + 5.4), (bx - 3.3, by + 5.4), (bx - 3.4, by + 3.4)], 'boot',
         shade_fn=lambda px, py: shade((px + .5 - bx) / 4, (py - by - 1) / 3.5, .02))
    ellipse(cv, bx, by + 3.6, 3.2, 1.7, 'boot', base=.1)
    T(cv, bx - 1, by + 3, 'F'); T(cv, bx, by + 3, 'F')
    for px in range(int(bx - 3), int(bx + 4)):
        T(cv, px, by + 5, 'C')


# catching his breath at the door, from the front: (how much of his height the upper body keeps as he bends toward us,
# how far his hips sink). Hands on his hips, knees out, the head dropped in front of the chest. The bend is done on the
# finished grid, so the upright pose is the one every other front pose is drawn from.
FRONT_MOVES = {'huff0': (.80, 2.4), 'huff1': (.70, 3.2), 'rise': (.93, 1.0)}


def fbend(g, pivot, seam, k):
    out = [row[:] for row in g]
    for y in range(pivot):
        out[y] = ['.'] * W
    d0 = round(pivot - (pivot - seam) * k)
    for y in range(d0, pivot):
        out[y] = g[pivot - round((pivot - y) / k)][:]
    drop = d0 - seam + 2
    for y in range(seam):
        ny = y + drop
        for x in range(W):
            if g[y][x] != '.' and 0 <= ny < H:
                out[ny][x] = g[y][x]
    return out


def build_front(raised=False, huff=None):
    # raised: the item-get pose, both fists over his head with the katana pointing straight up, the blaster in his belt
    cv = Canvas()
    x = CX
    Lk, Lf = LEG * .42, LEG * .72
    b = huff[1] if huff else 0
    hipy = FEET - Lf - 5.4 + b
    vy = hipy - TORSO
    y = vy - 18 - NECK
    cy = y + 11.2
    o = SH - 10.6

    # the katana's hilt over his right shoulder (our left), behind him, low and out from his ear
    if not raised:
        hilt(cv, x - 9.6, vy + .4, x - 12.6, vy - 4.6, 1.7)

    # legs, boots and rolled cuffs, the fly, light on the knees
    kk = b * .8   # knees out as the hips sink
    legs_p = ((-3.6 - STANCE * .6 - kk, Lk - b * .5, -3.8 - STANCE - kk * .3, Lf - b), (3.6 + STANCE * .6 + kk, Lk - b * .5, 3.8 + STANCE + kk * .3, Lf - b))
    poly(cv, [(x - WAIST - .4, hipy), (x + WAIST + .4, hipy), (x + WAIST + .2, hipy + 4), (x - WAIST - .2, hipy + 4)], 'jean', shade_fn=lambda px, py: shade((px + .5 - x) / 9, -.3, .04))
    for (kx, ky, fx, fy), s in zip(legs_p, (-1, 1)):
        capsule(cv, [(x + (3.2 + STANCE * .3) * s, hipy + 2, 3.2), (x + kx, hipy + ky, 2.7), (x + fx, hipy + fy, 2.5)], 'jean', base=.0)
    for (kx, ky, fx, fy) in legs_p:
        boot_front(cv, x + fx, hipy + fy)
        cuff(cv, x + fx, hipy + fy)
        T(cv, x + kx, hipy + ky - 1, 'x'); T(cv, x + kx - 1, hipy + ky, 'w')
    for py in range(int(hipy + 1), int(hipy + 6)):
        T(cv, x, py, 'u')
    T(cv, x - 1, hipy + 5, 'u')

    # the dark tee with the chest and abs under it, then the vest falling open over it
    top_w = SH - 2.2
    hw_at = lambda py: WAIST + (top_w - WAIST) * (1 - max(0, (py - vy) / TORSO)) ** 1.8
    cv.begin()
    for py in range(int(vy), int(vy + TORSO) + 1):
        hw = hw_at(py)
        for px in range(int(x - hw), int(x + hw) + 1):
            cv.put(px, py, 'navy', shade((px + .5 - x) / hw * .5, (py - vy) / TORSO * .8 - .3, .14))
    for px in range(int(x - 5), int(x + 6)):
        if abs(px + .5 - x) > .8:
            T(cv, px, vy + 6 + (abs(px + .5 - x) > 3.5), '1')
    for py in (vy + 10, vy + 13):
        T(cv, x - 1, py, '1'); T(cv, x + 1, py, '1')
    cv.begin()
    for py in range(int(vy), int(vy + TORSO) + 1):
        t = max(0, (py - vy) / TORSO)
        hw = hw_at(py)
        gap = 2.6 + 1.6 * t
        for px in range(int(x - hw), int(x + hw) + 1):
            d = abs(px + .5 - x)
            if d < gap:
                continue
            u = (px + .5 - x) / hw
            band = ((py - vy - 2) % 4.4) / 4.4
            b = shade(u * .9, (band - .45) * 1.2, .04) if py - vy >= 2 else shade(u, -.6, .06)
            if d < gap + 1:
                b -= .25          # the lapel turned in
            cv.put(px, py, 'vest', b)
    for k in range(1, 5):
        sy = int(vy + 2 + k * 4.4 - .5)
        for px in range(W):
            if cv.mat[sy][px] == 'vest' and cv.part[sy][px] == cv.pid:
                cv.tone[sy][px] = .12
    quilt_sheen(cv, x, vy, vy + TORSO, hw_at, gap=3.4)
    # the belt and its gold buckle; the katana's strap across his chest
    poly(cv, [(x - WAIST - .4, hipy - .5), (x + WAIST + .4, hipy - .5), (x + WAIST + .4, hipy + 1.5), (x - WAIST - .4, hipy + 1.5)], 'belt', shade_fn=lambda px, py: .6 if py == int(hipy - .5) else .4)
    for px in range(int(x - 1), int(x + 2)):
        for py in (int(hipy - .5), int(hipy + .5)):
            T(cv, px, py, 'k' if py == int(hipy - .5) else 'j')
    T(cv, x - 1, hipy - .5, 'l')
    for i in range(23):
        k = i / 22
        T(cv, x - 8.5 + k * 15.5, vy + 1 + k * 14.5, 'L' if i % 5 else 'M')
    T(cv, x + 1.6, vy + 8.8, 'k')

    # traps, the neck with its cords, the tee's neckline, the dog tags; charcoal sleeves; the vest's collar
    traps(cv, x, vy - 5)
    cv.begin()
    ntop, nbot = cy + 3, vy + .5
    for py in range(int(ntop), int(nbot) + 1):
        t = (py - ntop) / (nbot - ntop)
        hw = 4.6 + t * 1.2
        for px in range(int(x - hw), int(x + hw) + 1):
            cv.put(px, py, 'fur', shade((px + .5 - x) / hw * .9, t * .5 - .2, .04))
    for k in range(5):
        t = k / 4
        for s in (-1, 1):
            T(cv, x + s * (4.2 - 3.2 * t), ntop + 1.5 + t * (nbot - ntop - 2), 'a')
    for px in range(int(x - 4), int(x + 5)):
        T(cv, px, vy - (0 if abs(px + .5 - x) < 2.5 else 1), '2')
    for k in range(6):
        for s in (-1, 1):
            T(cv, x + s * (3.6 - .62 * k), vy - .5 + k * 1.0, 'H' if k % 2 == 0 else 'G')
    for dx, dy, c in ((0, 0, 'J'), (1, 0, 'I'), (0, 1, 'I'), (1, 1, 'H'), (0, 2, 'H'), (1, 2, 'G')):
        T(cv, x - .5 + dx, vy + 5.2 + dy, c)
    for s in (-1, 1):
        delt(cv, x, vy - 1.5, s)
        poly(cv, [(x + s * 4.6, vy - 2), (x + s * 7.8, vy - .5), (x + s * 7.6, vy + 1.5), (x + s * 4.8, vy + .8)], 'vest', shade_fn=lambda px, py: .55 if py < vy else .3)

    # the head: horns, ears, skull
    for s in (-1, 1):
        horn(cv, horn_pts(x + s * RX * .72, y + 8.2, s, FRONT_HORN))
    for s in (-1, 1):
        ellipse(cv, x + s * (RX + 1.6), cy + .2, 3.4, 1.8, 'fur', base=.22, hard=True)
        ellipse(cv, x + s * (RX + 2.0), cy + .3, 1.9, .9, 'snout', base=-.1)
    cv.begin(True)
    for py in range(int(cy - RY - 1), int(cy + RY + 2)):
        v = (py + .5 - cy) / RY
        if abs(v) > 1:
            continue
        t = (v + 1) / 2
        w = RX * math.sqrt(1 - v * v) ** .8 * (1.08 - .24 * t)
        for px in range(int(x - w - 1), int(x + w + 2)):
            u = (px + .5 - x) / max(w, .1)
            if abs(u) <= 1:
                cv.put(px, py, 'fur', shade(u, v * .7, .18))
    # the muzzle and a broad orange-tan snout
    cv.begin(True)
    for py in range(int(cy), int(cy + 8)):
        t = (py - cy) / 7.8
        hw = 4.6 - .9 * math.sin(t * math.pi * .9) + (t - .55) * 3.4 * (t > .55)
        for px in range(int(x - hw), int(x + hw) + 1):
            u = (px + .5 - x) / hw
            mat = 'snout' if t > .3 else 'fur'
            cv.put(px, py, mat, shade(u, (t - .6) * 1.3 if mat == 'snout' else t - .2, .2))
    for s in (-1, 1):
        T(cv, x + s * 2.0, cy + 5.2, 'Q'); T(cv, x + s * 2.4, cy + 5.8, 'Q')
        T(cv, x + s * 1.1, cy + 4.0, 'T')
    for px in range(int(x - 2), int(x + 3)):
        T(cv, px, cy + 7.3, 'Q')
    # clear glasses with grey frames, and behind them half-lidded eyes looking at you
    for s in (-1, 1):
        xa, xb = sorted((x + s * 1.2, x + s * 6.2))
        for px in range(int(xa), int(xb) + 1):
            T(cv, px, cy - 3, 'M'); T(cv, px, cy + .6, 'M')
        for py in range(int(cy - 3), int(cy + 1.6)):
            T(cv, xa, py, 'M'); T(cv, xb, py, 'M')
        for px in range(int(xa) + 1, int(xb)):
            for py in (cy - 2, cy - 1, cy):
                T(cv, px, py, 'c')
        ex = x + s * 3.6
        for dx in (-1, 0, 1):
            T(cv, ex + dx, cy - 2, 'b'); T(cv, ex + dx, cy - 1, 't'); T(cv, ex + dx, cy, 'c')
        T(cv, ex - s * .4, cy - 1, 'K')
        T(cv, xb - 1 if s > 0 else xa + 1, cy - 2, 'J')
        T(cv, x + s * 6.8, cy - 2.4, 'L'); T(cv, x + s * 7.6, cy - 2.2, 'L')
    T(cv, x, cy - 2, 'M'); T(cv, x - 1, cy - 2, 'M')
    for px in range(int(x - 6), int(x + 7)):
        T(cv, px, cy - 4, 'a' if abs(px + .5 - x) < 5.2 else 'b')
    # the pompadour
    cv.begin(True)
    for py in range(int(y - 3), int(y + 8)):
        for px in range(int(x - RX - 2), int(x + RX + 3)):
            u = (px + .5 - x - .4) / (RX * 1.06)
            v = (py + .5 - y - 3.2) / 5.2
            if u * u + v * v <= 1 and py + .5 < y + 6.4 - abs(u) * 1.0:
                cv.put(px, py, 'pomp', shade(u * .8, v, .16))
    curls(cv)
    for k in range(5):
        T(cv, x - 3.4 + k * 1.5, y + .2 + k * .4, 'h' if k < 3 else 'g')
    earring(cv, x - RX - 3.4, cy + 1.6)               # his right ear: our left from the front

    if huff:
        # the blaster tucked in his belt, his fists on his hips with the elbows out
        poly(cv, [(x - 6.6, hipy - 3.4), (x - 3.2, hipy - 3.4), (x - 3.2, hipy + 2.6), (x - 6.6, hipy + 2.6)], 'horn', hard=True,
             shade_fn=lambda px, py: shade((px + 5 - x) / 2.4, (py - hipy) / 4, .14))
        for s_ in (-1, 1):
            sh, el, hd = (x + s_ * (SH - 2.4), vy + 1.5), (x + s_ * (SH + 2.6), vy + 9.0), (x + s_ * (WAIST + 3.6), hipy - 1.6)
            arm(cv, sh, el, hd, 2.4)
            fist(cv, hd[0], hd[1], 2.9)
        furtex(cv)
        return fbend(finish(cv), int(hipy + 1.5), int(cy + 9), huff[0])
    if raised:
        # the blaster tucked in his belt; the arms up, both fists round the grip over his head, the blade up
        poly(cv, [(x - 6.6, hipy - 3.4), (x - 3.2, hipy - 3.4), (x - 3.2, hipy + 2.6), (x - 6.6, hipy + 2.6)], 'horn', hard=True,
             shade_fn=lambda px, py: shade((px + 5 - x) / 2.4, (py - hipy) / 4, .14))
        # his right fist (our left) high and out with the katana straight up; his left fist pumped up beside his head
        o = SH - 10.6
        hx, hy = x - 18.0 - o, vy - 13.0
        # a held-up blade, drawn bolder than in a swing: the grip through his fist, a wide gold guard, the blade up
        capsule(cv, [(hx, hy + 4.5, 1.1), (hx, hy - 1, 1.1)], 'sheath', base=.1, hard=True)
        T(cv, hx, hy + 4.5, 'k')
        capsule(cv, [(hx + .2, hy - 4, 1.6), (hx + .6, hy - 26, 1.2), (hx + .4, hy - 29, .5)], 'steel', base=.22, hard=True)
        for k in range(5, 25, 3):
            T(cv, hx + .2 + k * .016, hy - k, 'J')
        ellipse(cv, hx + .1, hy - 3.2, 3.0, 1.3, 'horn', base=-.05, hard=True)
        arm(cv, (x - (SH - 2.4), vy + 1.5), (x - 17.4 - o, vy - 1.5), (hx, hy), 2.6)
        arm(cv, (x + (SH - 2.4), vy + 1.5), (x + 17.0 + o, vy - 2), (x + 17.4 + o, vy - 9.5), 2.6)
        T(cv, hx + 1.6, hy - .4, 'd'); T(cv, x + 17.4 + o - 1.6, vy - 9.9, 'd')
        furtex(cv)
        return finish(cv)
    # the blaster held low in his right hand (our left), then the arms over it
    hx, hy = x - (SH - 2.8), vy + 16.5
    poly(cv, [(hx - 2.0, hy + .5), (hx + 2.0, hy + .5), (hx + 2.0, hy + 6.4), (hx - 2.0, hy + 6.4)], 'horn', hard=True,
         shade_fn=lambda px, py: shade((px + .5 - hx) / 2.4, (py - hy - 3) / 4, .14))
    for px in range(int(hx - 2), int(hx + 3)):
        T(cv, px, hy + 3.6, 'i')
    ellipse(cv, hx, hy + 7.0, 1.8, 1.2, 'ivory', base=.1, hard=True)
    T(cv, hx, hy + 7.4, 'P'); T(cv, hx - 1, hy + 7.4, 'X')
    sy = vy + 1.5
    for s in (-1, 1):
        sh, el, hd = (x + s * (SH - 2.4), sy), (x + s * (SH - 1.8), vy + 9.5), (x + s * (SH - 2.8), vy + 16.5)
        arm(cv, sh, el, hd, 2.4)
        fist(cv, hd[0], hd[1], 2.9)
        T(cv, hd[0] - s * 1.8, hd[1] - .6, 'd')     # the thumb
        T(cv, hd[0] - s * 1.4, hd[1] + .9, 'a')
    furtex(cv)
    return finish(cv)



# ---------- side poses: the arena's moves, from the same puppet as the turnaround's side view ----------
_Lk, _Lf = LEG * .42, LEG * .72
STAND_LEGS = ((-.6, _Lk, -1.4, _Lf), (2.0, _Lk, 1.2, _Lf))   # (knee x, knee y, foot x, foot y) from the hips: far leg, near leg
SIDE_NEAR = {   # elbow and hand of the near arm, from (x, vy)
    'down': lambda x, vy: ((x + 1.4, vy + 9.5), (x + 2.6, vy + 16.4)),
    'aim':  lambda x, vy: ((x + 5.6, vy + 7.6), (x + 10.4, vy + 9.2)),
    'rest': lambda x, vy: ((x + 3.4, vy + 9.6), (x + 7.4, vy + 13.0)),
    'twirl': lambda x, vy: ((x + 3.0, vy + 9.4), (x + 6.6, vy + 12.6)),
    'wind': lambda x, vy: ((x - 2.8, vy + 1.0), (x - 1.8, vy - 6.0)),
    'cut':  lambda x, vy: ((x + 6.2, vy + 5.2), (x + 11.6, vy + 8.2)),
    'flinch': lambda x, vy: ((x - 3.2, vy + 5.0), (x - 6.4, vy + 1.2)),
}
SIDE_FAR = {
    'down': lambda x, vy: ((x - 2.0, vy + 9.5), (x - 2.6, vy + 16.0)),
    'swingF': lambda x, vy: ((x + 1.6, vy + 9.0), (x + 4.4, vy + 14.6)),
    'swingB': lambda x, vy: ((x - 3.6, vy + 9.0), (x - 6.6, vy + 14.2)),
    'up': lambda x, vy: ((x + 1.0, vy + 7.5), (x + 3.6, vy + 11.0)),
    'flinch': lambda x, vy: ((x - 4.0, vy + 4.0), (x - 7.4, vy + .5)),
}
_C = CROUCH   # crouch depth, shared with the behind poses
SIDE_POSE = {
    'stand':  (STAND_LEGS, 'down', 'down', {}),
    'aim':    (STAND_LEGS, 'aim', 'down', {}),
    'idle':   (STAND_LEGS, 'rest', 'down', {'lean': -.4}),
    'twirl0': (STAND_LEGS, 'twirl', 'down', {'lean': -.4, 'spin': 0}),
    'twirl1': (STAND_LEGS, 'twirl', 'down', {'lean': -.4, 'spin': 1}),
    'twirl2': (STAND_LEGS, 'twirl', 'down', {'lean': -.4, 'spin': 2}),
    'twirl3': (STAND_LEGS, 'twirl', 'down', {'lean': -.4, 'spin': 3}),

    'run0':   (((-3.0, _Lk - .4, -6.2, _Lf - 1.4), (4.4, _Lk - 1.0, 6.4, _Lf)), 'aim', 'swingF', {'lean': 1.0, 'tail': 1}),
    'run1':   (((2.4, _Lk - 2.6, -1.8, _Lf - 5.6), (1.6, _Lk, .6, _Lf)), 'aim', 'down', {'lean': 1.0, 'bob': -1, 'tail': 0}),
    'run2':   (((4.4, _Lk - 1.0, 6.4, _Lf), (-3.0, _Lk - .4, -6.2, _Lf - 1.4)), 'aim', 'swingB', {'lean': 1.0, 'tail': -1}),
    'run3':   (((1.6, _Lk, .6, _Lf), (2.4, _Lk - 2.6, -1.8, _Lf - 5.6)), 'aim', 'down', {'lean': 1.0, 'bob': -1, 'tail': 0}),
    'jump':   (((1.4, _Lk - 3.4, -3.4, _Lf - 6.4), (5.4, _Lk - 4.6, 2.8, _Lf - 7.2)), 'aim', 'up', {'lean': .6, 'tail': 2}),
    'crouch': (((-1.0, _Lk - _C + 1.2, -3.4, _Lf - _C), (6.4, _Lk - _C - .4, 2.4, _Lf - _C)), 'aim', 'up', {'bob': _C, 'lean': 1.6, 'tail': -1}),
    # crouch-walking (the lobbies and the rides): two low steps from the crouch, the near boot then the far one lifted
    # and reaching, his body as the crouch's, rocking a pixel onto the planted foot
    'crouchWalk0': (((-2.2, _Lk - _C + 1.4, -5.0, _Lf - _C), (7.6, _Lk - _C - 1.6, 5.2, _Lf - _C - 1.8)), 'aim', 'up', {'bob': _C, 'lean': 1.8, 'tail': 0}),
    'crouchWalk1': (((5.4, _Lk - _C - 1.4, 4.2, _Lf - _C - 1.8), (3.0, _Lk - _C + .6, -3.0, _Lf - _C)), 'aim', 'up', {'bob': _C - .6, 'lean': 1.4, 'tail': -2}),
    'wind':   (STAND_LEGS, 'wind', 'swingB', {'lean': -.6}),
    'cut':    (((-3.0, _Lk - .4, -5.2, _Lf), (4.0, _Lk - .8, 5.0, _Lf)), 'cut', 'swingB', {'lean': 1.8, 'tail': 1}),
    'hurt':   (((-1.6, _Lk, -3.2, _Lf), (1.0, _Lk, 2.4, _Lf)), 'flinch', 'flinch', {'lean': -2.2, 'tail': -2}),
}


# the door: he braces (weight back, the near knee chambered high), then kicks out flat. Kept out of SIDES so the
# arena's box and feet don't move; the stairwell gets them as MOVES.
SIDE_MOVES = {
    'brace': (((-2.6, _Lk - .2, -4.4, _Lf), (6.0, _Lk - 7.4, 3.4, _Lf - 9.4)), 'rest', 'up', {'lean': -2.0, 'bob': 1, 'tail': -1}),
    'kick':  (((-3.6, _Lk - .6, -6.0, _Lf), (7.4, _Lk - 6.2, 14.4, _Lk - 5.6)), 'rest', 'flinch', {'lean': -3.0, 'tail': -2, 'kick': True}),
}


def blaster_side(cv, hx, hy):
    # the blaster in his fist, pointing the way he faces: build_blaster's shape, with its grip in his hand
    ox, oy = hx - 3.6, hy - 5.6
    poly(cv, [(ox + 1.5, oy + 4), (ox + 6, oy + 4), (ox + 4.4, oy + 12), (ox - .4, oy + 12)], 'belt', hard=True,
         shade_fn=lambda px, py: shade((px - ox - 2) / 4, (py - oy - 8) / 5, .1))
    ellipse(cv, ox + 6.6, oy + 2.6, 7.4, 3.8, 'horn', base=.12, hard=True)
    capsule(cv, [(ox + 11, oy + 1.8, 1.9), (ox + 19.6, oy + 1.8, 1.6)], 'horn', base=.18, hard=True)
    for rx in (13.4, 16.4):
        ellipse(cv, ox + rx, oy + 1.8, .9, 2.3, 'ivory', base=.1, hard=True)
    ellipse(cv, ox + 20.6, oy + 1.8, 1.3, 1.9, 'ivory', base=.15, hard=True)
    T(cv, ox + 21, oy + 1, 'P'); T(cv, ox + 21, oy + 2, 'P')
    T(cv, ox + 2, oy + 0, 'l'); T(cv, ox + 3, oy - .4, 'l')


def build_side(name='stand', bare=False):
    # facing right, so we see his left side. name picks a side pose (SIDE_POSE, or SIDE_MOVES for the door);
    # 'stand' is the turnaround's view. bare leaves the katana off his back (the stairwell, before the cabinet).
    legs, near, far, ex = SIDE_POSE[name] if name in SIDE_POSE else SIDE_MOVES[name]
    cv = Canvas()
    xl = CX - 2                       # hips and legs
    x = xl + ex.get('lean', 0)        # everything above the belt
    Lk, Lf = LEG * .42, LEG * .72
    hipy = FEET - Lf - 5.4 + ex.get('bob', 0)
    vy = hipy - TORSO
    y = vy - 18 - NECK
    cy = y + 11.2

    # the far arm, the katana across his back, the tail
    fe, fh = SIDE_FAR[far](x, vy)
    capsule(cv, [(x - .8, vy + 2, 2.6), (fe[0], fe[1], 1.9), (fh[0], fh[1], 1.7)], 'fur', base=-.12, hard=True)
    fist(cv, fh[0], fh[1] + .4, 2.7)
    if not bare:
        capsule(cv, [(x - 8.2, vy + 12, 1.2), (x - 4.6, vy - .6, 1.15)], 'sheath', hard=True)
    if near not in ('wind', 'cut') and not bare:
        hilt(cv, x - 4.6, vy - .8, x - 7.6, vy - 7.2)
    sw = ex.get('tail', 0)
    capsule(cv, [(xl - 5.2, hipy + 1, 1.0), (xl - 7.4 - sw * .5, hipy + 5, .9), (xl - 7.8 - sw, hipy + 10, .9)], 'fur', base=.06)
    ellipse(cv, xl - 7.9 - sw, hipy + 11.4, 1.7, 2.1, 'fur', base=-.04)
    # legs: the far one a step back and in shadow
    for (dx, base), (kx, ky, fx, fy) in zip(((-1.4, -.16), (1.2, .02)), legs):
        capsule(cv, [(xl - 1 + dx, hipy + 2, 3.5), (xl + kx, hipy + ky, 2.9), (xl + fx, hipy + fy, 2.6)], 'jean', base=base)
        bx, by = xl + fx, hipy + fy
        if ex.get('kick') and dx > 0:
            # the kicking boot, sole to the door: toe up, heel forward
            poly(cv, [(bx - 1, by - 4.6), (bx + 2.6, by - 5.4), (bx + 4.4, by - 4), (bx + 4.4, by + 4.4), (bx + 1.6, by + 4.8), (bx - 1.6, by + 2.4)], 'boot',
                 shade_fn=lambda px, py, bx=bx, by=by: shade((px - bx - 1) / 4, (py - by) / 5, .04))
            for py in range(int(by - 4), int(by + 5)):
                T(cv, bx + 4, py, 'C')
            T(cv, bx + 2, by - 3, 'F')
            continue
        poly(cv, [(bx - 2.8, by), (bx + 2.4, by), (bx + 3.2, by + 2.2), (bx + 6.6, by + 3.2), (bx + 6.8, by + 5.4), (bx - 3.0, by + 5.4)], 'boot',
             shade_fn=lambda px, py, bx=bx, by=by, b=base: shade((px - bx - 1) / 6, (py - by - 1.5) / 3.5, .02 + b))
        T(cv, bx + 4.2, by + 3, 'F'); T(cv, bx + 5.2, by + 3.2, 'E')
        for px in range(int(bx - 3), int(bx + 7)):
            T(cv, px, by + 5, 'C')
        cuff(cv, bx, by)
        T(cv, xl + kx + 1.2, hipy + ky, 'x')
    ellipse(cv, xl - 1.4, hipy + 2.4, 5.0, 4.0, 'jean', base=.0)
    for py in range(int(hipy + 1), int(hipy + 10)):
        T(cv, xl - 1.4 + (py - hipy) * .05, py, 'u')
    # the torso in profile: a deep chest, a straight back, a narrow waist; the dark tee at the open front
    cv.begin()
    front = lambda t: x + 4.0 + 4.6 * math.sin(min(1, t * 1.6 + .25) * math.pi * .6) * (1 - t * .55)
    back = lambda t: x - 5.6 + 1.6 * t
    for py in range(int(vy), int(vy + TORSO) + 1):
        t = max(0, (py - vy) / TORSO)
        f, bk = front(t), back(t)
        for px in range(int(bk), int(f) + 1):
            u = (px + .5 - (f + bk) / 2) / ((f - bk) / 2)
            band = ((py - vy - 2) % 4.4) / 4.4
            mat = 'navy' if px > f - 1.6 and t > .08 else 'vest'
            cv.put(px, py, mat, shade(u * .9 - .1, (band - .45) * 1.2, .04) if mat == 'vest' else shade(.6, t - .3, .14))
    for k in range(1, 5):
        sy = int(vy + 2 + k * 4.4 - .5)
        for px in range(W):
            if cv.mat[sy][px] == 'vest' and cv.part[sy][px] == cv.pid:
                cv.tone[sy][px] = .12
    for k in range(1, 4):
        T(cv, x - 3.4 + (k % 2), vy + 2.6 + k * 4.4, 'p')
    poly(cv, [(x - 4.6, hipy - .5), (x + 4.8, hipy - .5), (x + 4.8, hipy + 1.5), (x - 4.6, hipy + 1.5)], 'belt', shade_fn=lambda px, py: .6 if py == int(hipy - .5) else .4)
    T(cv, x + 4.6, hipy - .5, 'k'); T(cv, x + 4.6, hipy + .5, 'j')
    # the neck from under the jaw to the chest, sloping into the traps behind; the dog tags hanging forward
    poly(cv, [(x - 4.0, cy + 1.5), (x + 3.4, cy + 4.5), (x + 6.6, vy + 1), (x - 6.0, vy + 1.5)], 'fur',
         shade_fn=lambda px, py: shade((px + .5 - x) / 7, (py - vy + 3) / 6, .08))
    for k in range(5):
        T(cv, x + 2.4 + k * .8, cy + 6 + k * 1.4, 'a')
    T(cv, x + 6.2, vy + 3.4, 'J'); T(cv, x + 6.2, vy + 4.4, 'H')
    for k in range(4):
        T(cv, x + 3.4 + k * .8, vy - 1.6 + k * 1.3, 'H' if k % 2 else 'G')
    poly(cv, [(x - 5.6, vy - 1.6), (x - 2.4, vy - 2.4), (x - 1.6, vy + .4), (x - 5.4, vy + 1)], 'vest', shade_fn=lambda px, py: .5)

    # the head: the far horn, skull, a long muzzle forward to the snout
    horn(cv, [(x - 3.6, y + 7.0, 2.0), (x - 1.6, y + 5.4, 1.9), (x - .4, y + 2.4, 1.6), (x - .4, y - 1.0, 1.1), (x - 1.4, y - 3.6, .7)])
    ellipse(cv, x, cy, 6.2, 6.0, 'fur', base=.16, hard=True)
    cv.begin(True)
    for py in range(int(cy - 3), int(cy + 9)):
        for px in range(int(x + 1), int(x + 13)):
            t = (px + .5 - x - 1) / 11
            mid = cy + 1.2 + t * 3.0
            hw = 4.4 - t * 1.2
            if abs(py + .5 - mid) <= hw and t <= 1:
                mat = 'snout' if t > .55 else 'fur'
                cv.put(px, py, mat, shade(.2 + t * .4, (py + .5 - mid) / hw, .16))
    T(cv, x + 10.4, cy + 3.4, 'Q'); T(cv, x + 11, cy + 3.8, 'Q')
    T(cv, x + 9.8, cy + 2.4, 'T')
    for px in range(int(x + 6), int(x + 11)):
        T(cv, px, cy + 6.4 + (px - x - 6) * .1, 'Q')
    # the glasses in profile, the arm back to the ear
    for px in range(int(x + 3), int(x + 8)):
        T(cv, px, cy - 3, 'M'); T(cv, px, cy + .6, 'M')
    for py in range(int(cy - 3), int(cy + 1.6)):
        T(cv, x + 7.6, py, 'M')
    for px in (x + 4.6, x + 5.6, x + 6.6):
        T(cv, px, cy - 2, 'b'); T(cv, px, cy - 1, 't'); T(cv, px, cy, 'c')
    T(cv, x + 6.6, cy - 1, 'K'); T(cv, x + 7.0, cy - 2.4, 'J')
    for px in range(int(x - 3), int(x + 3)):
        T(cv, px, cy - 2.4 + (x + 3 - px) * .12, 'L')
    for px in range(int(x + 3), int(x + 9)):
        T(cv, px, cy - 4, 'a')
    ellipse(cv, x - 4.6, cy + .8, 3.0, 1.6, 'fur', base=.2, hard=True)
    ellipse(cv, x - 5.0, cy + .7, 1.6, .8, 'snout', base=-.1)
    # the pompadour in profile, then the near horn coming out from under it
    poly(cv, [(x + 8.0, y + 6.4), (x + 7.4, y + 1.4), (x + 3.4, y - 2.4), (x - 2.2, y - 1.8), (x - 6.4, y + 3.2), (x - 7.2, y + 9.0),
              (x - 6.0, y + 13.0), (x - 3.8, y + 14.8), (x - 2.4, y + 11.8), (x + .6, y + 9.2), (x + 4.4, y + 8.0)], 'pomp',
         shade_fn=lambda px, py: shade((px + .5 - x) / 8, (py - y - 5) / 8, .14))
    curls(cv)
    for k in range(5):
        T(cv, x + 5.0 - k * 1.6, y - .6 + k * .5, 'h' if k < 3 else 'g')
    horn(cv, [(x - 1.4, y + 7.4, 2.4), (x + 1.8, y + 5.8, 2.2), (x + 3.8, y + 2.8, 1.8), (x + 4.2, y - .8, 1.3), (x + 3.2, y - 3.8, .8)])

    # the near arm, and whatever's in its hand
    el, hd = SIDE_NEAR[near](x, vy)
    if near in ('aim', 'rest'):
        blaster_side(cv, hd[0], hd[1])
    ellipse(cv, x + .2, vy + 2.4, 3.6 * SLEEVE, 3.6 * SLEEVE, 'tee', base=.12, hard=True)
    arm(cv, (x + .2, vy + 2), el, hd, 2.4)
    fist(cv, hd[0], hd[1], 2.9)
    if near == 'twirl':
        blaster_spin(cv, hd[0] + .6, hd[1] + 1.4, (4 - ex['spin']) % 4)
        fist(cv, hd[0], hd[1], 2.6)
    if near == 'wind':
        katana_held(cv, hd[0], hd[1], hd[0] - 10, hd[1] - 13)
    if near == 'cut':
        katana_held(cv, hd[0], hd[1], hd[0] + 16, hd[1] + 3)
    furtex(cv)
    return finish(cv)


def build_blaster():
    # the blaster on its own, from the side: a gold body, cream rings on the barrel, a lit cell and muzzle
    cv = Canvas(lit_above=99)
    ox, oy = 20, 30
    poly(cv, [(ox + 1.5, oy + 4), (ox + 6, oy + 4), (ox + 4.4, oy + 12), (ox - .4, oy + 12)], 'belt', hard=True,
         shade_fn=lambda px, py: shade((px - ox - 2) / 4, (py - oy - 8) / 5, .1))
    for k in range(3):
        T(cv, ox + 2.2 + k * .2, oy + 6.4 + k * 1.8, 'y')
    poly(cv, [(ox + 5.2, oy + 4.4), (ox + 9, oy + 4.4), (ox + 8.6, oy + 7.4), (ox + 6.6, oy + 7.4)], 'horn', hard=True, shade_fn=lambda px, py: .3)
    ellipse(cv, ox + 6.6, oy + 2.6, 7.4, 3.8, 'horn', base=.12, hard=True)
    capsule(cv, [(ox + 11, oy + 1.8, 1.9), (ox + 19.6, oy + 1.8, 1.6)], 'horn', base=.18, hard=True)
    for rx in (13.4, 16.4):
        ellipse(cv, ox + rx, oy + 1.8, .9, 2.3, 'ivory', base=.1, hard=True)
    ellipse(cv, ox + 20.6, oy + 1.8, 1.3, 1.9, 'ivory', base=.15, hard=True)
    T(cv, ox + 21, oy + 1, 'P'); T(cv, ox + 21, oy + 2, 'P')
    for k in range(3):
        T(cv, ox + 3.6 + k, oy + 1.4, 'P' if k == 1 else 'X')
    T(cv, ox + 2, oy + 0, 'l'); T(cv, ox + 3, oy - .4, 'l')
    return finish(cv)


# ---------- output ----------
def box(grids):
    xs = [x for g in grids for r in g for x, c in enumerate(r) if c != '.']
    ys = [y for g in grids for y, r in enumerate(g) for c in r if c != '.']
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def crop(g, b):
    x0, y0, x1, y1 = b
    return [''.join(r[x0:x1]) for r in g[y0:y1]]


def build_all():
    poses = {n: build_pose(n) for n in POSE}
    pb = box(list(poses.values()))
    views = {'front': build_front(), 'side': build_side(), 'back': poses['stand']}
    vb = box(list(views.values()))
    blaster = build_blaster()
    sides = {n: build_side(n) for n in SIDE_POSE if n != 'stand'}
    sb = box(list(sides.values()))
    bare = {n: build_side(n, bare=True) for n in SIDE_POSE if n != 'stand'}
    moves = {n: build_side(n) for n in SIDE_MOVES}
    raised = build_front(raised=True)
    fronts = {n: build_front(huff=v) for n, v in FRONT_MOVES.items()}
    mb, rb, fb = box(list(moves.values())), box([raised]), box(list(fronts.values()))
    out = {
        'sidesBare': {n: crop(g, sb) for n, g in bare.items()},
        'moves': {n: crop(g, mb) for n, g in moves.items()},
        'movesFeet': [CX - 2 - mb[0], FEET - mb[1]],
        'raised': crop(raised, rb),
        'raisedFeet': [CX - rb[0], FEET - rb[1]],
        'fronts': {n: crop(g, fb) for n, g in fronts.items()},
        'frontFeet': [CX - fb[0], FEET - fb[1]],
        'sides': {n: crop(g, sb) for n, g in sides.items()},
        'sideFeet': [CX - 2 - sb[0], FEET - sb[1]],
        'poses': {n: crop(g, pb) for n, g in poses.items()},
        'feet': [CX - pb[0], FEET - pb[1]],
        'views': {n: crop(g, vb) for n, g in views.items()},
        'viewFeet': [CX - vb[0], FEET - vb[1]],
        'blaster': crop(blaster, box([blaster])),
    }
    aim = out['poses']['aim']
    ps = [(x, y) for y, r in enumerate(aim) for x, c in enumerate(r) if c == 'P']
    sa = out['sides']['aim']
    sp = [(x, y) for y, r in enumerate(sa) for x, c in enumerate(r) if c == 'P']
    mx = max(p[0] for p in sp)
    sp = [p for p in sp if p[0] == mx]
    out['sideMuzzle'] = [round(mx - out['sideFeet'][0], 1), round(sum(p[1] for p in sp) / len(sp) - out['sideFeet'][1], 1)]
    out['muzzle'] = [round(sum(p[0] for p in ps) / len(ps) - out['feet'][0], 1), round(sum(p[1] for p in ps) / len(ps) - out['feet'][1], 1)]
    return out


def grid_js(rows, indent):
    pad = ' ' * indent
    return '[\n' + ',\n'.join(pad + "'" + r + "'" for r in rows) + '\n' + ' ' * (indent - 2) + ']'


def to_js(d):
    used = sorted({c for g in list(d['poses'].values()) + list(d['views'].values()) + list(d['sides'].values()) + list(d['sidesBare'].values()) + list(d['moves'].values()) + list(d['fronts'].values()) + [d['blaster'], d['raised']] for r in g for c in r} - {'.'})
    pal = ', '.join(f"'{c}': '#{CHARS[c]}'" for c in used)
    lines = [
        '// Unruggabull for Unruggabull II, drawn by tools/unruggabull-ii/bull.py. Don\'t edit by hand: change the script and run it.',
        '// Classic script, loaded before art.js, which turns the grids into the canvases the game draws.',
        '// Text grids, one character per pixel and "." for none. Every pose shares one box with his feet at FEET.',
        'var UnrugBull = (function () {',
        "  'use strict';",
        f'  const PAL = {{ {pal} }};',
        '  // From behind, as the game sees him.',
        '  const POSES = {',
    ]
    for n, g in d['poses'].items():
        lines.append(f'    {n}: {grid_js(g, 6)},')
    lines += [
        '  };',
        f"  const FEET = {{ x: {d['feet'][0]}, y: {d['feet'][1]} }};",
        '  // Where bolts leave the blaster in the aim pose, from his feet.',
        f"  const MUZZLE = {{ x: {d['muzzle'][0]}, y: {d['muzzle'][1]} }};",
        '  // The turnaround: front, side (facing right) and back, in one box with his feet at VIEW_FEET.',
        '  const VIEWS = {',
    ]
    for n, g in d['views'].items():
        lines.append(f'    {n}: {grid_js(g, 6)},')
    lines += [
        '  };',
        f"  const VIEW_FEET = {{ x: {d['viewFeet'][0]}, y: {d['viewFeet'][1]} }};",
        '  // Side poses for the arena (facing right), in one box with his feet at SIDE_FEET; SIDE_MUZZLE is the aim poses\' muzzle.',
        '  const SIDES = {',
    ]
    for n, g in d['sides'].items():
        lines.append(f'    {n}: {grid_js(g, 6)},')
    lines += [
        '  };',
        f"  const SIDE_FEET = {{ x: {d['sideFeet'][0]}, y: {d['sideFeet'][1]} }};",
        f"  const SIDE_MUZZLE = {{ x: {d['sideMuzzle'][0]}, y: {d['sideMuzzle'][1]} }};",
        '  // The stairwell: the side poses with no katana on his back (before the cabinet), in the same box as SIDES;',
        '  // the door (brace, kick) in their own box with his feet at MOVES_FEET; and the item-get pose, from the front',
        '  // with the katana raised over his head, feet at RAISED_FEET; and the breather at the door from the front',
        '  // (hands on his hips, bent over toward us), feet at FRONT_FEET.',
        '  const SIDES_BARE = {',
    ]
    for n, g in d['sidesBare'].items():
        lines.append(f'    {n}: {grid_js(g, 6)},')
    lines += ['  };', '  const MOVES = {']
    for n, g in d['moves'].items():
        lines.append(f'    {n}: {grid_js(g, 6)},')
    lines += [
        '  };',
        f"  const MOVES_FEET = {{ x: {d['movesFeet'][0]}, y: {d['movesFeet'][1]} }};",
        f"  const RAISED = {grid_js(d['raised'], 4)};",
        f"  const RAISED_FEET = {{ x: {d['raisedFeet'][0]}, y: {d['raisedFeet'][1]} }};",
        '  const FRONTS = {',
    ]
    for n, g in d['fronts'].items():
        lines.append(f'    {n}: {grid_js(g, 6)},')
    lines += [
        '  };',
        f"  const FRONT_FEET = {{ x: {d['frontFeet'][0]}, y: {d['frontFeet'][1]} }};",
        '  // The blaster on its own, from the side.',
        f"  const BLASTER = {grid_js(d['blaster'], 4)};",
        '',
        '  // A grid to a canvas, at one pixel per character.',
        '  function paint(rows) {',
        "    const cv = document.createElement('canvas'), w = rows[0].length, h = rows.length;",
        "    cv.width = w; cv.height = h;",
        "    const g = cv.getContext('2d');",
        '    rows.forEach((r, y) => { for (let x = 0; x < w; x++) { const c = PAL[r[x]]; if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } } });',
        '    return cv;',
        '  }',
        '',
        '  return { PAL, POSES, FEET, MUZZLE, VIEWS, VIEW_FEET, SIDES, SIDE_FEET, SIDE_MUZZLE, SIDES_BARE, MOVES, MOVES_FEET, RAISED, RAISED_FEET, FRONTS, FRONT_FEET, BLASTER, paint };',
        '})();',
        '',
    ]
    return '\n'.join(lines)


def save_pngs(d, folder):
    from PIL import Image
    folder = Path(folder); folder.mkdir(parents=True, exist_ok=True)
    rgb = {c: tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) for c, h in CHARS.items()}
    items = [('bare-' + n, g) for n, g in d['sidesBare'].items()] + [('move-' + n, g) for n, g in d['moves'].items()] + [('raised', d['raised'])] + [('front-' + n, g) for n, g in d['fronts'].items()] + [('pose-' + n, g) for n, g in d['poses'].items()] + [('view-' + n, g) for n, g in d['views'].items()] + [('side-' + n, g) for n, g in d['sides'].items()] + [('blaster', d['blaster'])]
    for name, g in items:
        im = Image.new('RGBA', (len(g[0]), len(g)), (0, 0, 0, 0))
        for y, r in enumerate(g):
            for x, c in enumerate(r):
                if c != '.':
                    im.putpixel((x, y), rgb[c] + (255,))
        im.save(folder / f'{name}.png')


if __name__ == '__main__':
    d = build_all()
    js = to_js(d)
    if '--check' in sys.argv:
        if not OUT.exists() or OUT.read_text() != js:
            sys.exit('bull.js is out of date: run python3 tools/unruggabull-ii/bull.py')
        print('bull.js is up to date')
    else:
        OUT.write_text(js)
        print(f'wrote {OUT.relative_to(ROOT)}: {len(d["poses"])} poses, 3 views, the blaster')
    if '--png' in sys.argv:
        save_pngs(d, sys.argv[sys.argv.index('--png') + 1])
