"""Draws the carpshits and the temps for Unruggabull II at full resolution, the way bull.py draws the bull.

Each one is a puppet of shaded shapes (a woven rug, its border and fringe, eyes, brows, a mouth; for temps a collar, a
tie and hair) posed in code and frozen into text grids: one character per pixel, four tones per material (dark to
light, cool shadows, warm lights), K for black outlines, lit edges in a dark tone of their own colour. The grids are
drawn 1:1 into the 480x270 picture, so the game draws them at half a game unit per pixel, like the bull.

    python3 tools/unruggabull-ii/sprites.py            writes site/unruggabull-ii/sprites.js
    python3 tools/unruggabull-ii/sprites.py --check    fails if sprites.js is out of date with this script
    python3 tools/unruggabull-ii/sprites.py --png DIR  also saves every frame as a PNG (needs Pillow)

The look (October 2026): the owner picked the boldest of three takes ("too detailed and dull colored. it gets lost"
about the first): flat hot red rugs, a bright gold border, cream fringe, a thick outline and big simple faces, so a
carpshit reads at a glance against the hall. The other takes stay in STYLES for reference; only boldest is written.
"""
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'site/unruggabull-ii/sprites.js'

# ---------- colours: four tones per material, dark to light, cool shadows and warm lights ----------
MAT = {
    'rug':   ('abcd', ['4a0e1e', '8c1c26', 'c8362a', 'f06a46']),   # the carpshit's red field
    'gold':  ('efgh', ['5e2c10', 'a8641a', 'e0a232', 'fbe27a']),   # its woven border
    'thread': ('ijkl', ['7a6040', 'b89a68', 'e6d2a2', 'fff6dc']),  # the fringe
    'eye':   ('mnop', ['7a7470', 'bcb6aa', 'ece6d8', 'fffcf2']),
    'mouth': ('qrst', ['1e0810', '3e1018', '7a2232', 'b8485a']),
    'jute':  ('uvwx', ['4a3418', '7a5a2e', 'a8844a', 'd2b06e']),   # the backing, where a corner folds over
    'shirt': ('yzAB', ['5e6072', '9a9cae', 'd6d8e2', 'fafbff']),
    'tieR':  ('CDEF', ['3a0a1a', '6e1430', 'a42444', 'd84a5e']),   # a wine tie, so it doesn't melt into the rug
    'tieB':  ('GHIJ', ['10183a', '203a78', '3a62b0', '6a96dc']),
    'tieT':  ('LMNO', ['0a2a2a', '14524e', '24867a', '4cbca6']),
    'hair':  ('PQRS', ['1e100c', '3e2216', '64381e', '8e5a2c']),
    'grey':  ('TUVW', ['3a3a46', '6a6a7a', 'a2a2b0', 'd6d6e0']),
    'frame': ('XYZ0', ['14141e', '2c2c3a', '50506a', '8a8aa6']),
    'visor': ('1234', ['0e3a20', '1f6a40', '3aa86a', '8ce0a8']),
    'mon':   ('9$%&', ['16181e', '262830', '3e424e', '62677a']),
}
# the rest of the cast: paper, hearts, souls, coffee, staples (one style only: bold)
MAT.update({
    'paper': ('!#()', ['8a8a9a', 'c4c4d2', 'ecedf6', 'ffffff']),
    'heart': (',-/:', ['8a0c1a', 'e01e3a', 'ff4a5a', 'ffa0a8']),
    'dim':   (';<>?', ['2a2634', '3e3a4a', '57526a', '78738e']),
    'soul':  ('@[]^', ['3a6a9a', '7ab8e8', 'bfe8ff', 'ffffff']),
    'brew':  ('_{|}', ['2a140a', '5a2e14', '8a4a1e', 'c07a38']),
    'steel': ('5678', ['3e3e4a', '7e8090', 'c4c6d4', 'f4f6ff']),
})
MAT_V1 = {k: (v[0], list(v[1])) for k, v in MAT.items()}
# The bold takes: hotter, more saturated colours that hold up under the hall's light, so a carpshit reads at game size.
BOLD_COLS = {
    'rug':    ['8a0c0a', 'e0241a', 'ff4422', 'ff8650'],
    'gold':   ['a05a00', 'f0a400', 'ffd21e', 'fff27a'],
    'thread': ['e0c890', 'f8e8b8', 'fff6dc', 'ffffff'],
    'eye':    ['b0a898', 'e8e2d0', 'fffaf0', 'ffffff'],
    'mouth':  ['200810', '4a0c18', '8a1c30', 'd04460'],
    'jute':   ['6a4a18', 'a07830', 'd0a850', 'f0d080'],
    'shirt':  ['7a7c90', 'b8bacc', 'eceef6', 'ffffff'],
    'tieR':   ['5a0a30', '9a1850', 'd42a6a', 'ff6a9a'],
    'tieB':   ['10206a', '2048b0', '3a78f0', '8ab8ff'],
    'tieT':   ['084040', '107a6a', '20b89a', '6af0d0'],
    'hair':   ['2a140a', '5a2e14', '8a4a1e', 'c07a38'],
    'grey':   ['50505e', '8a8a9a', 'c8c8d4', 'f4f4fa'],
    'visor':  ['0e5028', '1f9048', '3ad070', 'a0ffb8'],
}
# v1: the first take (fine weave, lattice, pinstripe). bold: flat areas, two or three shade steps, a thick outline.
# boldest: flatter still, one tone per area plus a lit top and a shadowed bottom.
STYLES = {
    'v1':      {'cols': {}, 'detail': True, 'thick': False, 'flat': False, 'eye': (3.8, 3.2), 'pupil': 2},
    'bold':    {'cols': BOLD_COLS, 'detail': False, 'thick': True, 'flat': False, 'eye': (4.4, 3.6), 'pupil': 2},
    'boldest': {'cols': BOLD_COLS, 'detail': False, 'thick': True, 'flat': True, 'eye': (4.6, 3.8), 'pupil': 3},
}
ST = STYLES['v1']
CHARS, TONE = {}, {}


def set_style(name):
    global ST
    ST = STYLES[name]
    CHARS.clear(); TONE.clear()
    CHARS.update({'K': '0a080d', '*': '9cf0b4', '+': '4cbf84', '=': 'ffd44a'})   # outline, a lit screen, its glow, a badge clip
    for m, (cs, hx) in MAT_V1.items():
        hx = ST['cols'].get(m, hx)
        MAT[m] = (cs, hx)
        TONE[m] = cs
        for c, h in zip(cs, hx):
            CHARS[c] = h


set_style('v1')


# ---------- the canvas and its shapes (as bull.py, sized per sprite) ----------
class Canvas:
    def __init__(self, w, h, lit_above=999):
        self.W, self.H = w, h
        self.mat = [[None] * w for _ in range(h)]
        self.tone = [[0.0] * w for _ in range(h)]
        self.part = [[0] * w for _ in range(h)]
        self.line = [[False] * w for _ in range(h)]
        self.pid = 0
        self.hard = False
        self.force = {}
        self.lit_above = lit_above

    def begin(self, hard=False):
        self.pid += 1
        self.hard = hard

    def put(self, x, y, mat, b):
        if 0 <= x < self.W and 0 <= y < self.H:
            self.mat[y][x] = mat
            self.tone[y][x] = b
            self.part[y][x] = self.pid
            self.line[y][x] = self.hard

    def erase(self, x, y):
        if 0 <= x < self.W and 0 <= y < self.H:
            self.mat[y][x] = None


def T(cv, x, y, c):
    cv.force[(int(math.floor(x)), int(math.floor(y)))] = c


def shade(nx, ny, base=0.0):
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


def inside(pts, px, py):
    c = False
    for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
        if (ay > py) != (by > py) and px < ax + (bx - ax) * (py - ay) / (by - ay):
            c = not c
    return c


def poly(cv, pts, mat, base=0.0, hard=False, shade_fn=None):
    cv.begin(hard)
    ys = [p[1] for p in pts]; xs = [p[0] for p in pts]
    for y in range(int(min(ys)) - 1, int(max(ys)) + 2):
        for x in range(int(min(xs)) - 1, int(max(xs)) + 2):
            if inside(pts, x + .5, y + .5):
                cv.put(x, y, mat, shade_fn(x, y) if shade_fn else 0.6 + base)


def tone_index(b):
    return 0 if b < .28 else 1 if b < .5 else 2 if b < .78 else 3


def finish(cv):
    """Shapes to characters with inner lines and outlines, as bull.py: a lit edge (a top, or a side above lit_above)
    takes the darkest tone of the material it bounds; undersides stay black."""
    W, H = cv.W, cv.H
    g = [['.'] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            m = cv.mat[y][x]
            if m:
                g[y][x] = TONE[m][tone_index(cv.tone[y][x])]
    for y in range(H):
        for x in range(W):
            m = cv.mat[y][x]
            if not m:
                continue
            p = cv.part[y][x]
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < W and 0 <= yy < H and cv.mat[yy][xx] and cv.part[yy][xx] < p and (cv.mat[yy][xx] != m or cv.line[y][x]):
                    g[y][x] = 'K' if cv.line[y][x] else TONE[m][0]
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
                    out[y][x] = TONE[m][0] if (lit and m and m not in ('hair', 'frame', 'mon') and not ST['thick']) else 'K'
                    break
    if ST['thick']:   # a second ring of black round the silhouette
        ring = [row[:] for row in out]
        for y in range(H):
            for x in range(W):
                if out[y][x] == '.' and any(0 <= x + dx < W and 0 <= y + dy < H and out[y + dy][x + dx] != '.' for dx, dy in ((0, 1), (1, 0), (-1, 0), (0, -1))):
                    ring[y][x] = 'K'
        out = ring
    for (x, y), c in cv.force.items():
        if 0 <= x < W and 0 <= y < H:
            out[y][x] = c
    return [''.join(r) for r in out]


# ---------- the rug ----------
# A carpshit is a woven rug, wider than tall: a gold border round a red field with a faint diamond lattice in it, a
# thin gold pinstripe inside the border, little gold diamonds at the corners, and cream fringe on its two short ends.
# Its face sits in the middle of the field. fold='wind' folds its top right corner up and back (the jute backing shows,
# and that's where it holds its paper wad); fold='throw' flings that corner out to the right.
RW, RH = 46, 20   # the rug's body, outline to outline


def rug_body(cv, x0, y0, w=RW, h=RH, fold=None, sag=0.0):
    x1, y1 = x0 + w, y0 + h
    cx, cy = x0 + w / 2, y0 + h / 2
    fx0, fy1 = x1 - 12, y0 + 9                     # the fold line from (fx0, y0) to (x1, fy1)
    def keep(x, y):
        if fold and (x + .5 - fx0) / (x1 - fx0) + (y0 + h - (y + .5)) / h > 1 + (fy1 - y0) / h - .02 and (y + .5 - y0) / (fy1 - y0) < (x + .5 - fx0) / (x1 - fx0):
            return False
        return True
    def top(x):   # a soft sag along the top edge (sag > 0 dips the middle)
        u = (x + .5 - cx) / (w / 2)
        return y0 + sag * (1 - u * u)
    cv.begin()
    for y in range(int(y0), int(y1)):
        for x in range(int(x0), int(x1)):
            if y + .5 < top(x) or not keep(x, y):
                continue
            lx, ly = x - x0, y - y0
            # rounded corners
            if (lx < 1 or lx > w - 2) and (ly < 1 or ly > h - 2):
                continue
            nx, ny = (x + .5 - cx) / (w / 2), (y + .5 - cy) / (h / 2)
            b = shade(nx * .55, ny * .75, .05)
            border = lx < 2 or lx > w - 3 or ly < 2 or ly > h - 3
            if not ST['detail']:
                if ST['flat']:   # one tone, a lit top row, a shadowed bottom
                    b = .9 if ly in (0, 2) and not (border and ly == 2) else .4 if ly >= h - (1 if border else 3) else .6
                    if border and ly < 2:
                        b = .9 if ly == 1 or lx in (1, w - 2) else .6
                else:            # three broad bands, lit from above
                    b = .76 - .3 * ny + (.1 if ly == (0 if border else 2) else 0)
                    if border and not (ly < 2 or ly > h - 3):
                        b = .7 - .2 * ny
                cv.put(x, y, 'gold' if border else 'rug', b)
                continue
            if border:
                b += (.12 if (lx + ly) % 2 == 0 else -.06)            # the border's woven ticks
                cv.put(x, y, 'gold', b)
                continue
            # the field: a basket weave in 2x1 dabs, a faint lattice, a pinstripe inside the border
            b += (.07 if (lx // 2 + ly) % 2 else -.05) + (h01(lx, ly) - .5) * .08
            px_, py_ = lx - w / 2 + .5, ly - h / 2 + .5
            if (int(abs(px_) + abs(py_) * 1.6) % 8) == 0:
                b -= .1
            if (lx in (3, w - 4) and 3 <= ly <= h - 4) or (ly in (3, h - 4) and 3 <= lx <= w - 4):
                cv.put(x, y, 'rug', b - .3)          # a dark pinstripe inside the border
                continue
            cv.put(x, y, 'rug', b)
    # corner diamonds
    for (dx, dy) in [] if not ST['detail'] else ((5, 5), (w - 6, 5), (5, h - 6), (w - 6, h - 6)):
        if fold and dx > w / 2 and dy < h / 2:
            continue
        for ox, oy, c in ((0, -1, 'g'), (-1, 0, 'f'), (1, 0, 'g'), (0, 1, 'f'), (0, 0, 'h')):
            if keep(x0 + dx + ox, y0 + dy + oy):
                T(cv, x0 + dx + ox, y0 + dy + oy, c)
    return keep


def fringe(cv, x0, y0, w, h, f, rows=None, sides=(-1, 1)):
    """Tassels on the short ends: one every two rows, fluttering between frames. Forced pixels, so no outline."""
    for s in sides:
        ex = (x0 - 1 if s < 0 else x0 + w) + (s * 1 if ST['thick'] else 0)
        for i, y in enumerate(range(int(y0) + 2, int(y0 + h) - 1, 2)):
            if rows and y not in rows:
                continue
            n = 3 + ((i + f) % 2)                               # long and short in turn, swapping each frame
            lift = -1 if (i + f) % 3 == 0 and n == 4 else 0     # a tip flicked up
            for k in range(n):
                yy = y + (lift if k == n - 1 else 0)
                T(cv, ex + s * k, yy, 'l' if k == 0 else 'k' if k < n - 1 else 'j')


# ---------- faces ----------
def eye(cv, x, y, look=(0, 0), lid=0.0, rx=None, ry=None):
    """A cream eye with a 2x2 pupil; lid (0..1) closes it from the top."""
    rx = rx or ST['eye'][0]; ry = ry or ST['eye'][1]
    cut = y - ry + lid * ry * 2
    ellipse(cv, x, y, rx, ry, 'eye', base=.25, hard=True, clip=lambda px, py: py + .5 >= cut)
    px, py = round(x + look[0] * 1.5), round(y + .3 + look[1] * 1.0 + lid * 1.0)
    pr = range(-1, ST['pupil'] - 1)
    for dx in pr:
        for dy in pr:
            if py + dy + .5 >= cut + .6:
                T(cv, px + dx, py + dy, 'K')
    if lid < .4:
        T(cv, px - 2 if look[0] >= 0 else px + 1, py - 2, 'p')   # the catchlight


def line_px(cv, x0, y0, x1, y1, c, thick=1):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for k in range(n + 1):
        t = k / n
        for d in range(thick):
            T(cv, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + d, c)


def mouth(cv, x, y, kind):
    if kind == 'grr' and not ST['detail']:   # a plain frown with two fangs
        poly(cv, [(x - 7, y + 3.5), (x - 4, y), (x + 4, y), (x + 7, y + 3.5), (x + 4, y + 2.5), (x - 4, y + 2.5)], 'mouth', hard=True, shade_fn=lambda px, py: .2)
        for fx in (x - 3, x + 2):
            T(cv, fx, y + 1, 'p'); T(cv, fx, y + 2, 'o')
    elif kind == 'grr':        # a cross frown with teeth
        poly(cv, [(x - 6, y + 2.5), (x - 4, y), (x + 4, y), (x + 6, y + 2.5), (x + 4, y + 3.5), (x - 4, y + 3.5)], 'mouth', hard=True,
             shade_fn=lambda px, py: .2)
        for px in range(int(x - 4), int(x + 4)):
            T(cv, px, y, 'o' if (px % 2) else 'p')
        T(cv, x - 3, y + 1, 'o'); T(cv, x + 2, y + 1, 'o')
    elif kind == 'yell':     # wide open, shouting
        ellipse(cv, x, y + 2, 4.6, 3.4, 'mouth', base=-.2, hard=True)
        for px in range(int(x - 3), int(x + 3)):
            T(cv, px, y - .6, 'p')
        ellipse(cv, x, y + 4, 2.4, 1.1, 'mouth', base=.5)
    elif kind == 'o':        # shocked
        ellipse(cv, x, y + 1.5, 2.4, 2.6, 'mouth', base=-.2, hard=True)
    elif kind == 'grit':     # teeth clenched
        poly(cv, [(x - 5, y), (x + 5, y), (x + 5, y + 3), (x - 5, y + 3)], 'eye', hard=True, shade_fn=lambda px, py: .7)
        for px in range(int(x - 4), int(x + 5), 2):
            T(cv, px, y + 1, 'n'); T(cv, px, y + 2, 'n')
        for px in range(int(x - 4), int(x + 5)):
            T(cv, px, y + 1.5, 'n')
    elif kind == 'line':
        for px in range(int(x - 3), int(x + 4)):
            T(cv, px, y + 1, 'K')
    elif kind == 'smirk':
        for px in range(int(x - 3), int(x + 4)):
            T(cv, px, y + 1 - (px > x + 1), 'K')
    elif kind == 'talk':
        ellipse(cv, x, y + 1.5, 3.2, 1.8, 'mouth', base=-.1, hard=True)
    elif kind == 'smile':
        for px in range(int(x - 4), int(x + 5)):
            T(cv, px, y + 1 + (abs(px + .5 - x) < 3), 'K')
    elif kind == 'snore':
        ellipse(cv, x, y + 1.5, 1.8, 1.6, 'mouth', base=-.1, hard=True)
    elif kind == 'wobble':
        for px in range(int(x - 4), int(x + 5)):
            T(cv, px, y + 1 + ((px // 2) % 2), 'K')


def face(cv, cx, cy, o):
    """o: eyes ('angry', 'narrow', 'calm', 'down', 'side', 'up', 'wide', 'shut', 'x', 'squeeze'), mouth (see mouth)."""
    ex, ey = 8.5, cy - 1.5
    kind = o.get('eyes', 'angry')
    for s in (-1, 1):
        x = cx + s * ex
        if kind == 'x':
            for k in range(-2, 3):
                T(cv, x + k, ey + k, 'K'); T(cv, x + k, ey - k, 'K')
                if not ST['detail']:
                    T(cv, x + k + 1, ey + k, 'K'); T(cv, x + k + 1, ey - k, 'K')
        elif kind == 'shut':
            for k in range(-3, 4):
                T(cv, x + k, ey + 1 + (abs(k) == 3) * -1 + (abs(k) < 2), 'K')
        elif kind == 'squeeze':   # > < screwed shut
            line_px(cv, x - s * 2, ey - 2, x + s * 1.5, ey, 'K')
            line_px(cv, x + s * 1.5, ey, x - s * 2, ey + 2, 'K')
        else:
            look = {'angry': (0, .3), 'calm': (0, 0), 'down': (0, 1), 'side': (o.get('side', 1), 0), 'up': (0, -1),
                    'wide': (0, 0), 'narrow': (0, .4)}[kind]
            lid = {'angry': .28, 'narrow': .5, 'down': .4, 'calm': .15, 'side': .25, 'up': 0, 'wide': 0}[kind]
            eye(cv, x, ey, look, lid, ry=ST['eye'][1] + (.4 if kind == 'wide' else 0))
        # brows
        if kind in ('angry', 'narrow'):           # cross: down toward the middle, two pixels thick
            if ST['detail']:
                line_px(cv, x + s * 4, ey - 6, x - s * 3, ey - 3.4, 'K', 2)
            else:   # bigger, heavier
                line_px(cv, x + s * 5.5, ey - 6.2, x - s * 3.5, ey - 3.0, 'K', 3)
        elif kind in ('side', 'up', 'wide', 'x', 'squeeze'):   # raised
            line_px(cv, x - s * 3, ey - 6.2, x + s * 3, ey - 5.2, 'K', 1 if ST['detail'] else 2)
        else:                                     # level
            line_px(cv, x - 3, ey - 5, x + 3, ey - 5, 'K', 1 if ST['detail'] else 2)
    mouth(cv, cx, cy + 4, o.get('mouth', 'grr'))


# ---------- the flying carpshit ----------
FW, FH = 56, 24


def carp(f=0, look='angry', mouth_='grr', cut=False):
    cv = Canvas(FW, FH, lit_above=12)
    x0, y0 = 5, 2
    rug_body(cv, x0, y0)
    cx, cy = x0 + RW / 2, y0 + RH / 2
    face(cv, cx, cy, {'eyes': look, 'mouth': mouth_})
    g = finish(cv)
    fcv = Canvas(FW, FH)
    fringe(fcv, x0, y0, RW, RH, f)
    for (x, y), c in fcv.force.items():
        if g[y][x] == '.':
            g[y] = g[y][:x] + c + g[y][x + 1:]
    if cut:
        # sliced down the middle: the jute backing shows at the cut, and a few loose threads hang out top and bottom
        mid = FW // 2
        rows = [list(r) for r in g]
        for y in range(FH):
            for x in (mid - 1, mid):
                if rows[y][x] != '.' and 3 <= y <= FH - 4:
                    rows[y][x] = 'v' if (y + x) % 2 else 'w'
        for x, y, c in ((mid - 1, 0, 'k'), (mid - 2, 1, 'j'), (mid, FH - 1, 'k'), (mid + 1, FH - 2, 'j')):
            rows[y][x] = c
        g = [''.join(r) for r in rows]
    return g


# ---------- carpshits at work: the flying carpshit's body with other faces, for the scenes in art.js ----------
FACES = {
    'down':  [{'eyes': 'down', 'mouth': 'line'}] * 2,                                  # typing, eyes on the screen
    'downV': [{'eyes': 'down', 'mouth': 'line', 'visor': True}] * 2,                   # the same in a green visor
    'talk':  [{'eyes': 'side', 'mouth': 'talk'}, {'eyes': 'side', 'mouth': 'line'}],  # on a call, or telling at the cooler
    'side':  [{'eyes': 'side', 'mouth': 'line'}] * 2,                                  # listening
    'wide':  [{'eyes': 'wide', 'mouth': 'o'}] * 2,                                     # can't believe it
    'shut':  [{'eyes': 'shut', 'mouth': 'snore'}] * 2,                                 # asleep
    'smile': [{'eyes': 'down', 'mouth': 'smile'}] * 2,                                 # pleased with its copies
}


def face_carp(o, f):
    cv = Canvas(FW, FH, lit_above=12)
    x0, y0 = 5, 2
    carp_at(cv, x0, y0, o, f, o.get('visor', False))
    g = finish(cv)
    fcv = Canvas(FW, FH)
    fringe(fcv, x0, y0, RW, RH, f)
    for (x, y), c in fcv.force.items():
        if g[y][x] == '.':
            g[y] = g[y][:x] + c + g[y][x + 1:]
    return g


# ---------- temps: carpshits in a collar and tie, popping up over a cubicle ----------
TW, TH = 64, 46
TX0, TY0 = 8, 12      # where the rug sits in a temp's box: room above it for a raised corner and its wad


def wad(cv, x, y):
    ellipse(cv, x, y, 3.2, 3.0, 'shirt', base=.15, hard=True)
    T(cv, x - 1, y - 1, 'B'); T(cv, x + 1, y, 'z'); T(cv, x - 1, y + 1, 'z'); T(cv, x, y - 2, 'B'); T(cv, x + 1, y + 1, 'z')


def tie(cv, cx, top, mat, flip=0):
    ch = TONE[mat]
    # collar points
    for s in (-1, 1):
        poly(cv, [(cx + s * .5, top - 1), (cx + s * 7, top - 1), (cx + s * 5, top + 3.5), (cx + s * 1.5, top + 2)], 'shirt', hard=True,
             shade_fn=lambda px, py: .66 - (py - top) * .06)
    if flip:   # flung up over its shoulder
        capsule(cv, [(cx, top + 1, 1.8), (cx + 5 * flip, top - 3, 2.2), (cx + 10 * flip, top - 5, 1.6)], mat, base=.1, hard=True)
        ellipse(cv, cx, top + 1, 2.0, 1.8, mat, base=.25, hard=True)
        return
    poly(cv, [(cx - 2.2, top + 2.5), (cx + 2.2, top + 2.5), (cx + 3.4, top + 12), (cx, top + 14.5), (cx - 3.4, top + 12)], mat, hard=True,
         shade_fn=lambda px, py: shade((px + .5 - cx) / 3.4, (py - top - 8) / 8, .08))
    ellipse(cv, cx, top + 1, 2.2, 1.9, mat, base=.25, hard=True)   # the knot
    if mat == 'tieR':   # gold stripes
        for k in range(3):
            yy = top + 5 + k * 3
            for dx in range(-2, 3):
                T(cv, cx + dx, yy + dx * .4, 'g' if k % 2 == 0 else 'f')


def hair(cv, style, x0, y0, w, f=0):
    cx = x0 + w / 2
    if style == 'part':     # a neat side part, combed over to our right
        cv.begin(True)
        for y in range(int(y0 - 6), int(y0 + 3)):
            for x in range(int(x0 + 4), int(x0 + w - 3)):
                u = (x + .5 - cx) / (w / 2 - 3)
                top = y0 - 4.2 + 3.0 * u * u - 1.2 * (u > -.3) * (1 - abs(u))
                if y + .5 >= top and y + .5 <= y0 + 2.4 - (abs(u) > .8) * 1.5:
                    cv.put(x, y, 'hair', shade(u * .8, (y - y0 + 2) / 4, .1) + (.12 if (x + y) % 5 == 0 else 0))
        part = cx - 8
        for y in range(int(y0 - 4), int(y0 + 2)):
            T(cv, part, y, 'P')
        for k in range(8):   # a shine along the swoop
            T(cv, part + 3 + k * 1.6, y0 - 3.2 + (k / 7) ** 2 * 1.6, 'S')
    elif style == 'curls':  # short dark curls
        for i in range(9):
            hx = x0 + 6 + i * (w - 12) / 8
            hy = y0 - 1.2 - math.sin(i / 8 * math.pi) * 1.8
            ellipse(cv, hx, hy, 3.0, 2.6, 'hair', base=.05 + (i % 2) * .08, hard=False)
        for y in range(cv.H):
            for x in range(cv.W):
                if cv.mat[y][x] == 'hair':
                    n = h01(x // 2 + 7, y // 2 + 3)
                    cv.tone[y][x] += .2 if n > .7 else -.12 if n < .25 else 0
    elif style == 'combover':   # a few long grey strands swept over from the left
        for k in range(3):
            yy = y0 - 1 + k * 2.2
            pts = [(x0 + 4, yy + 5, .6), (x0 + 11, yy - 1.2, .7), (x0 + 24 + k * 3, yy - 1.4 + k * .3, .6), (x0 + 33 + k * 2, yy + .6 + k * .4, .5)]
            capsule(cv, pts, 'grey', base=.25 - k * .08, hard=False)


def glasses(cv, cx, ey):
    for s in (-1, 1):
        x = cx + s * 8
        for px in range(int(x - 5), int(x + 5)):
            T(cv, px, ey - 4.5, 'X'); T(cv, px, ey + 3.5, 'X')
        for py in range(int(ey - 4.5), int(ey + 4.5)):
            T(cv, x - 5, py, 'X'); T(cv, x + 4, py, 'X')
        T(cv, x + 3 * s, ey - 3.5, 'p')   # glint
        T(cv, x + 2 * s, ey - 2.5, 'o')
    for px in range(int(cx - 3), int(cx + 3)):
        T(cv, px, ey - 3, 'X')


def badge(cv, cx, top):
    # a lanyard and a visitor badge on its chest
    for k in range(7):
        T(cv, cx - 7 + k * .3, top + 1 + k, 'G'); T(cv, cx + 7 - k * .3, top + 1 + k, 'G')
    poly(cv, [(cx - 6, top + 8), (cx + 1, top + 8), (cx + 1, top + 15), (cx - 6, top + 15)], 'shirt', hard=True, shade_fn=lambda px, py: .9)
    for px in range(int(cx - 5), int(cx)):
        T(cv, px, top + 9, 'D'); T(cv, px, top + 10, 'D')
    for px in range(int(cx - 5), int(cx)):
        if px % 2:
            T(cv, px, top + 12, 'z')
    T(cv, cx - 3, top + 7, '=')


LOOKS = {
    'A': {'hair': 'part', 'tie': 'tieR', 'glasses': False, 'badge': False},
    'B': {'hair': 'curls', 'tie': 'tieB', 'glasses': True, 'badge': False},
    'C': {'hair': 'combover', 'tie': 'tieT', 'glasses': False, 'badge': True},
}
TEMP_STATES = {
    'peek':  {'eyes': 'side', 'mouth': 'line'},
    'up':    {'eyes': 'angry', 'mouth': 'smirk'},
    'wind':  {'eyes': 'narrow', 'mouth': 'grit'},
    'throw': {'eyes': 'angry', 'mouth': 'yell'},
    'hit':   {'eyes': 'squeeze', 'mouth': 'wobble'},
}


def temp(look, state, f=0):
    L, S = LOOKS[look], TEMP_STATES[state]
    cv = Canvas(TW, TH, lit_above=TY0 + 10)
    x0, y0 = TX0, TY0
    cx, cy = x0 + RW / 2, y0 + RH / 2
    hit = state == 'hit'
    fold = 'wind' if state == 'wind' else 'throw' if state == 'throw' else None
    # the collar and tie hang below the rug; drawn first so the rug's bottom edge sits over the knot
    if not hit:
        tie(cv, cx, y0 + RH - 1, L['tie'])
    rug_body(cv, x0, y0, fold=fold, sag=1.0 if hit else 0)
    if hit:   # the tie flung up over its shoulder, in front
        tie(cv, cx, y0 + RH - 1, L['tie'], flip=1)
    if fold == 'wind':
        # the corner folded up and back: its jute backing, gold-edged, holding the wad up high
        fx0, fy1, x1 = x0 + RW - 12, y0 + 9, x0 + RW
        tip = (x1 + 1, y0 - 9)
        poly(cv, [(fx0, y0), (x1, fy1), tip], 'jute', hard=True, shade_fn=lambda px, py: shade(0, (py - y0) / 9, .05) + (.08 if (px + py) % 3 == 0 else 0))
        for k in range(10):
            t = k / 9
            T(cv, fx0 + (tip[0] - fx0) * t, y0 + (tip[1] - y0) * t, 'f' if k % 2 else 'g')
        wad(cv, tip[0] + 1, tip[1] - 2)
    if fold == 'throw':
        # the corner flung out to the right: its front, gold edge, speed lines behind
        fx0, fy1, x1 = x0 + RW - 12, y0 + 9, x0 + RW
        tip = (x1 + 8, y0 - 1)
        poly(cv, [(fx0, y0), (x1, fy1), tip], 'rug', hard=False, shade_fn=lambda px, py: shade(.2, (py - y0) / 9 - .3, .08) + ((.07 if (px // 2 + py) % 2 else -.05) if ST['detail'] else 0))
        for k in range(12):
            t = k / 11
            T(cv, fx0 + (tip[0] - fx0) * t, y0 + (tip[1] - y0) * t, 'g' if k % 2 else 'h')
        for i, (sx, sy) in enumerate(((x1 - 4, y0 - 5), (x1 - 1, y0 - 7), (x1 + 3, y0 - 6))):
            for k in range(3):
                T(cv, sx - k, sy + k, 'B' if k == 0 else 'z')
    face(cv, cx, cy + (1 if hit else 0), S)
    if L['glasses']:
        glasses(cv, cx, cy - 1.5 + (1 if hit else 0))
    hair(cv, L['hair'], x0, y0 + (1 if hit else 0), RW, f)
    if L['badge']:
        badge(cv, cx - 6, y0 + RH)
    if hit:   # stars
        for sx, sy in ((x0 - 3, y0 - 2), (x0 + RW + 2, y0 + 1), (cx + 2, y0 - 7)):
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                T(cv, sx + dx, sy + dy, '=' if (dx, dy) == (0, 0) else 'h')
    g = finish(cv)
    # fringe on the ends, not up where the corner's folded
    fcv = Canvas(TW, TH)
    fringe(fcv, x0, y0, RW, RH, f, sides=(-1,) if fold else (-1, 1))
    if fold:
        fringe(fcv, x0, y0, RW, RH, f, rows=[y for y in range(y0 + 10, y0 + RH)], sides=(1,))
    for (x, y), c in fcv.force.items():
        if 0 <= y < TH and 0 <= x < TW and g[y][x] == '.':
            g[y] = g[y][:x] + c + g[y][x + 1:]
    if hit:   # knocked back: a lean to our left, more at the top
        g = [('.' * (2 - y * 3 // TH) + r)[:TW] if (2 - y * 3 // TH) > 0 else r for y, r in enumerate(g)]
    return g


# ---------- carpshits at work ----------


def carp_at(cv, x0, y0, o, f, visor=False):
    rug_body(cv, x0, y0)
    face(cv, x0 + RW / 2, y0 + RH / 2, o)
    if visor:
        # an accountant's green visor round the top of the rug
        poly(cv, [(x0 - 1, y0 + 1), (x0 + RW + 1, y0 + 1), (x0 + RW + 1, y0 + 4), (x0 - 1, y0 + 4)], 'visor', hard=True, shade_fn=lambda px, py: .5)
        poly(cv, [(x0 + 3, y0 + 4), (x0 + RW - 3, y0 + 4), (x0 + RW - 7, y0 + 8), (x0 + 7, y0 + 8)], 'visor', hard=True,
             shade_fn=lambda px, py: .82 - (py - y0 - 4) * .1 + (.15 if (px + py) % 4 == 0 else 0))


# ---------- the rest of the cast: souls, hearts, paper, coffee, the Spread Shot ----------
# At twice the old sprites' size (so half a game unit a pixel, like everything else), flat and bold. Paper is white
# and crumpled or sharp; what you can pick up is round and warm, and the game adds its glow and outline.
def soul():
    cv = Canvas(18, 22, lit_above=99)
    ellipse(cv, 9, 2.5, 5, 1.6, 'gold', base=.4, hard=True)                 # its halo
    for x in range(6, 13):
        T(cv, x, 2.5, '.')
    capsule(cv, [(9, 10, 6.2), (9, 14, 6.2)], 'soul', base=.25, hard=True)  # the body
    for k, x in enumerate((4, 9, 14)):
        ellipse(cv, x, 19 + (k % 2), 2.2, 1.8, 'soul', base=.1)              # its wavy hem
    g = finish(cv)
    rows = [list(r) for r in g]
    for x, y in ((6, 11), (7, 11), (6, 12), (7, 12), (11, 11), (12, 11), (11, 12), (12, 12), (8, 15), (9, 15), (10, 15)):
        rows[y][x] = 'K'
    return [''.join(r) for r in rows]




def soul_salute():
    """A soul saluting, its arm out to the elbow and back up to its brow: the two souls from the blaster saying goodbye
    when the Shredder's beaten. Drawn facing us; the game flips it for the other one."""
    cv = Canvas(24, 22, lit_above=99)
    ellipse(cv, 9, 2.5, 5, 1.6, 'gold', base=.4, hard=True)                 # its halo
    for x in range(6, 13):
        T(cv, x, 2.5, '.')
    capsule(cv, [(9, 10, 6.2), (9, 14, 6.2)], 'soul', base=.25, hard=True)  # the body
    for k, x in enumerate((4, 9, 14)):
        ellipse(cv, x, 19 + (k % 2), 2.2, 1.8, 'soul', base=.1)              # its wavy hem
    capsule(cv, [(14.6, 14, 1.2), (19.6, 11, 1.1)], 'soul', base=.45, hard=True)   # the upper arm, out to the elbow
    capsule(cv, [(19.6, 11, 1.1), (14.2, 7.4, 1.0)], 'soul', base=.6, hard=True)   # the forearm, back to its brow
    ellipse(cv, 13.4, 7.2, 1.6, 1.0, 'soul', base=.8, hard=True)                 # a flat hand
    g = finish(cv)
    rows = [list(r) for r in g]
    for x, y in ((6, 11), (7, 11), (6, 12), (7, 12), (11, 11), (12, 11), (11, 12), (12, 12), (8, 15), (9, 15), (10, 15)):
        rows[y][x] = 'K'
    return [''.join(r) for r in rows]

def bull_soul():
    """Unruggabull's own soul, rising when he's rugged: a soul with his horns, ears and a muzzle, all in the soul's
    ghostly blue (the owner's pick over cream horns), and a halo."""
    cv = Canvas(30, 28, lit_above=99)
    ellipse(cv, 15, 2.5, 6, 1.6, 'gold', base=.4, hard=True)                 # its halo
    for x in range(11, 20):
        T(cv, x, 2.5, '.')
    for d in (-1, 1):
        capsule(cv, [(15 + d * 5, 10, 1.9), (15 + d * 9, 8.5, 1.5), (15 + d * 11.5, 5, 1.0)], 'soul', base=.35, hard=True)  # horns
        ellipse(cv, 15 + d * 7.4, 12, 2.2, 1.3, 'soul', base=.1, hard=True)    # ears
    capsule(cv, [(15, 13, 6.4), (15, 18, 6.6)], 'soul', base=.25, hard=True)   # the body
    for k, x in enumerate((9.5, 15, 20.5)):
        ellipse(cv, x, 24 + (k % 2), 2.4, 1.9, 'soul', base=.1)               # its wavy hem
    ellipse(cv, 15, 18.2, 4.2, 2.6, 'soul', base=.55, hard=True)              # the muzzle
    g = finish(cv)
    rows = [list(r) for r in g]
    for x, y in ((11, 13), (12, 13), (11, 14), (12, 14), (17, 13), (18, 13), (17, 14), (18, 14), (13, 18), (17, 18)):
        rows[y][x] = 'K'                                                       # eyes and nostrils
    return [''.join(r) for r in rows]

def heart(mat):
    cv = Canvas(20, 18, lit_above=99)
    for x in (6, 13):
        ellipse(cv, x, 6, 4.6, 4.6, mat, base=.25)
    poly(cv, [(1.6, 7), (18.4, 7), (10, 16)], mat, shade_fn=lambda px, py: shade((px - 10) / 9, (py - 9) / 8, .15))
    if mat == 'heart':
        T(cv, 5, 4, ':'); T(cv, 6, 4, ':'); T(cv, 4, 5, ':')
    return finish(cv)


def paper_wad():
    cv = Canvas(14, 14, lit_above=99)
    ellipse(cv, 7, 7, 5.2, 4.8, 'paper', base=.3, hard=True)
    for x, y in ((5, 5), (6, 6), (8, 4), (9, 8), (4, 8), (7, 9), (10, 6)):
        T(cv, x, y, '!')
    return finish(cv)


def bundle():
    """The Shredder's paper bundle: a crumpled ball of ruled paper, blue rules and a red margin, creased (the owner's
    pick over a starburst of shreddings, which read as a splat)."""
    cv = Canvas(24, 22, lit_above=99)
    ellipse(cv, 12, 11, 10.4, 9.6, 'paper', base=.15, hard=True)
    inside = lambda x, y: ((x + .5 - 12) / 10.4) ** 2 + ((y + .5 - 11) / 9.6) ** 2 < .82
    for ry in (5, 9, 13, 17):
        for x in range(3, 22):
            y = ry + (1 if math.sin(x * .9 + ry) > .55 else 0) - (1 if math.sin(x * .5 + ry * 2) < -.7 else 0)
            if inside(x, y):
                T(cv, x, y, TONE['tieB'][2])
    for y in range(2, 21):
        x = 7 + (1 if y > 11 else 0)
        if inside(x, y):
            T(cv, x, y, TONE['rug'][2])
    for (x0, y0, x1, y1) in ((10, 4, 14, 8), (14, 8, 12, 12), (12, 12, 17, 15), (5, 12, 9, 15), (16, 4, 19, 7)):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for k in range(n + 1):
            T(cv, round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n), TONE['paper'][1])
    return finish(cv)


def staple():
    """The Shredder's staples: four locked into a throwing star, points out (the owner's pick: "the spinning ones").
    The game spins it as it flies."""
    cv = Canvas(20, 20, lit_above=99)
    c = 10
    for k in range(4):
        a = k * math.pi / 2
        x1, y1 = c + math.cos(a) * 8.5, c + math.sin(a) * 8.5
        capsule(cv, [(c + math.cos(a) * 2, c + math.sin(a) * 2, 1.4), (x1, y1, .8)], 'steel', base=.35, hard=True)
        T(cv, x1, y1, TONE['steel'][3])
    ellipse(cv, c, c, 2.4, 2.4, 'rug', base=.4, hard=True)
    return finish(cv)


def plane():
    cv = Canvas(20, 12, lit_above=99)
    poly(cv, [(10, 1), (19, 10), (10, 7)], 'paper', shade_fn=lambda px, py: .45)
    poly(cv, [(10, 1), (1, 10), (10, 7)], 'paper', shade_fn=lambda px, py: .75)
    poly(cv, [(9, 7), (11, 7), (10, 11)], 'paper', shade_fn=lambda px, py: .2)
    return finish(cv)


def coffee():
    cv = Canvas(20, 22, lit_above=99)
    capsule(cv, [(15, 12, 2.6), (15, 15, 2.6)], 'paper', base=.3, hard=True)     # the handle
    T(cv, 15, 13, '.'); T(cv, 15, 14, '.')
    poly(cv, [(3, 8), (15, 8), (14, 20), (4, 20)], 'paper', hard=True, shade_fn=lambda px, py: shade((px - 9) / 7, -.2, .3))
    poly(cv, [(3.4, 12), (14.6, 12), (14.3, 16), (3.7, 16)], 'rug', shade_fn=lambda px, py: shade((px - 9) / 7, 0, .2))   # RugCo red band
    ellipse(cv, 9, 8, 6, 1.6, 'brew', base=.3, hard=True)                          # the coffee
    for x, y in ((7, 2), (7, 4), (8, 3), (11, 1), (11, 3), (12, 2)):
        T(cv, x, y, ')')                                                            # steam
    return finish(cv)


def spread():
    cv = Canvas(24, 20, lit_above=99)
    for a in (-.6, 0, .6):                                                           # three bolts fanning out
        tip = (12 + math.sin(a) * 10, 15 - math.cos(a) * 12)
        capsule(cv, [(12, 15, 1.6), (tip[0], tip[1], 1.2)], 'gold', base=.35, hard=True)
        ellipse(cv, tip[0], tip[1], 2, 2, 'gold', base=.6, hard=True)
    ellipse(cv, 12, 16, 4.2, 3, 'tieB', base=.3, hard=True)                          # the emitter
    return finish(cv)


def cast():
    return {'SOUL': soul(), 'SOUL_SALUTE': soul_salute(), 'BULL_SOUL': bull_soul(), 'HEART': heart('heart'), 'HEART_EMPTY': heart('dim'), 'WAD': paper_wad(), 'BUNDLE': bundle(),
            'STAPLE': staple(), 'PLANE': plane(), 'COFFEE': coffee(), 'SPREAD': spread()}


# ---------- output ----------
def build_all():
    d = {}
    d['fly'] = [carp(0), carp(1)]
    d['flyHit'] = carp(0, look='squeeze', mouth_='wobble')
    d['cut'] = carp(0, look='x', mouth_='o', cut=True)
    d['temps'] = {k: {s: [temp(k, s, 0), temp(k, s, 1)] if s in ('peek', 'up') else [temp(k, s, 0)] for s in TEMP_STATES} for k in LOOKS}
    d['work'] = {k: [face_carp(o, f) for f, o in enumerate(os)] for k, os in FACES.items()}
    d['cast'] = cast()
    return d


def grid_js(rows, indent):
    pad = ' ' * indent
    return '[\n' + ',\n'.join(pad + "'" + r + "'" for r in rows) + '\n' + ' ' * (indent - 2) + ']'


def all_grids(d):
    out = list(d['fly']) + [d['flyHit'], d['cut']]
    for k in d['temps'].values():
        for fr in k.values():
            out += fr
    for fr in d['work'].values():
        out += fr
    return out + list(d.get('cast', {}).values())


def set_js(d):
    """One style's grids as a JS object literal, with its own palette."""
    used = sorted({c for g in all_grids(d) for r in g for c in r} - {'.'})
    pal = ', '.join(f"'{c}': '#{CHARS[c]}'" for c in used)
    L = ['{', f'    PAL: {{ {pal} }},',
         f"    FLY: [{grid_js(d['fly'][0], 6)}, {grid_js(d['fly'][1], 6)}],",
         f"    FLY_HIT: {grid_js(d['flyHit'], 6)},",
         f"    CUT: {grid_js(d['cut'], 6)},",
         '    TEMPS: {']
    for k, st in d['temps'].items():
        L.append(f'      {k}: {{')
        for s_, frs in st.items():
            L.append(f'        {s_}: [' + ', '.join(grid_js(g, 10) for g in frs) + '],')
        L.append('      },')
    L += ['    },', '    CAST: {'] + [f'      {k}: {grid_js(g, 8)},' for k, g in d['cast'].items()] + ['    },', '    FACES: {']
    for k, frs in d['work'].items():
        L.append(f'      {k}: [' + ', '.join(grid_js(g, 8) for g in frs) + '],')
    L += ['    }', '  }']
    return '\n'.join(L)


def to_js(sets, main='bold'):
    L = [
        '// The carpshits and temps for Unruggabull II, drawn by tools/unruggabull-ii/sprites.py. Don\'t edit by hand: change the script and run it.',
        '// Text grids, one character per pixel and "." for none, drawn 1:1 into the 480x270 picture (half a game unit a pixel).',
        '// Classic script, loaded before art.js. SETS holds the take written (' + main + '), with its palette; the top level is the same.',
        '// Each take: FLY (two frames of fringe flutter), FLY_HIT, CUT, TEMPS[look][state] (lists of frames, rug at the same',
        '// spot in every frame), FACES[name] (two frames: a carpshit at work, by its look; art.js puts them in their scenes).',
        'var UnrugSprites = (function () {',
        "  'use strict';",
        '  const SETS = {',
    ]
    for name, d in sets.items():
        L.append(f'  {name}: ' + set_js(d) + ',')
    L += [
        '  };',
        f'  const TEMP_RUG = {{ x: {TX0}, y: {TY0}, w: {RW}, h: {RH} }};   // where the rug sits in a temp\'s box',
        '  // A grid to a canvas, at one pixel per character, in a take\'s palette.',
        f"  function paint(rows, pal) {{",
        f"    pal = pal || SETS.{main}.PAL;",
        "    const cv = document.createElement('canvas'), w = Math.max(...rows.map(r => r.length)), h = rows.length;",
        '    cv.width = w; cv.height = h;',
        "    const g = cv.getContext('2d');",
        '    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = pal[r[x]]; if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } } });',
        '    return cv;',
        '  }',
        f'  return Object.assign({{ SETS, TEMP_RUG, paint }}, SETS.{main});',
        '})();',
        '',
    ]
    return '\n'.join(L)


def save_pngs(d, folder, zoom=4):
    from PIL import Image
    folder = Path(folder); folder.mkdir(parents=True, exist_ok=True)
    rgb = {c: tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) for c, h in CHARS.items()}
    items = [('fly0', d['fly'][0]), ('fly1', d['fly'][1]), ('flyHit', d['flyHit']), ('cut', d['cut'])]
    for k, st in d['temps'].items():
        for s, frs in st.items():
            items += [(f'temp{k}-{s}{i}', g) for i, g in enumerate(frs)]
    for k, frs in d['work'].items():
        items += [(f'work-{k}{i}', g) for i, g in enumerate(frs)]
    for name, g in items:
        im = Image.new('RGBA', (len(g[0]), len(g)), (40, 36, 48, 255))
        for y, r in enumerate(g):
            for x, c in enumerate(r):
                if c != '.':
                    im.putpixel((x, y), rgb[c] + (255,))
        im.resize((im.width * zoom, im.height * zoom), Image.NEAREST).save(folder / f'{name}.png')


if __name__ == '__main__':
    set_style('boldest')
    d = build_all()
    js = to_js({'boldest': d}, main='boldest')
    if '--check' in sys.argv:
        if not OUT.exists() or OUT.read_text() != js:
            sys.exit('sprites.js is out of date: run python3 tools/unruggabull-ii/sprites.py')
        print('sprites.js is up to date')
    else:
        OUT.write_text(js)
        print(f'wrote {OUT.relative_to(ROOT)}: {len(all_grids(d))} frames')
    if '--png' in sys.argv:
        save_pngs(d, Path(sys.argv[sys.argv.index('--png') + 1]))
