"""The intro's six stills, from the owner's ChatGPT pictures to data the game draws (Oct 2026).

Each picture is shrunk to the game's 480x270 picture (still 5, the tall tower, to 480x540, which the intro pans up),
touched up where the shot list asks (below, in EDITS), mapped to the game's 64 colours with render.js's 4x4 Bayer
dither and saved as a lossless WebP inside intro-stills.js. The source pictures are not kept in the repo; they're the
owner's, and the shot list (the project's unruggabull-ii-intro.md) says which is which.

    python3 tools/unruggabull-ii/intro/stills.py SRC_DIR           writes site/unruggabull-ii/intro-stills.js
    python3 tools/unruggabull-ii/intro/stills.py SRC_DIR --png DIR also saves each still as a PNG, 2x, for looking at

SRC_DIR holds still1.png .. still6.png, and the owner's Rugfather strips, alive.png (13 cells of 256 x 256) and dead.png
(5 cells), drawn at twice their own pixel grid. Two frames are kept, halved back to that grid: alive cell 8 (side on,
an arm reaching left: still 3, teaching) and dead cell 1 (the burning heap: still 1). His front (alive cell 2) is
already in the game as portrait.js, so the intro uses that. Needs Pillow and numpy.

The dither: the same matrix as render.js, at four times its strength. In the hall it only has to smooth light that is
already in the palette's steps; a painted sky has wide gradients that band into stripes at the game's own strength.
"""
import base64
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'site/unruggabull-ii/intro-stills.js'

# render.js's palette and its colour lookup (32 levels a channel, weighted distance), copied exactly
PAL = ['08070c', '110f18', '1a1824', '24222f', '2f2d3b', '3b3a48', '4b4a58', '5e5e6c', '76788a', '9496a8', 'b4b6c4', 'd2d4dc', 'ecedf0', 'ffffff', '1c1614', '2c2420', '3e332c', '54463c', '6e5e50', '8c7a68', 'b0a088', 'd8c8a8', 'f4e6c4', 'fff6e0', '3a2014', '5a3420', '7a4a2a', '9e6638', '1e080c', '340e12', '521418', '761c1e', '9c2622', 'c43428', 'e44a34', 'ff6e4a', '5c1430', '9a2050', 'e03a78', 'ff8ab4', '6a3410', '9a5214', 'c87818', 'e8a028', 'f8cc50', 'fff09a', '0a2418', '124a2c', '1f7a44', '3cba6a', '9cf0b4', '0a1a2c', '10304e', '1a5076', '2a7aa6', '46aad4', '86d6f0', 'c8f4ff', '1e1430', '2e2048', '44305e', '5e4478', '000000', '0c1020']
RGB = np.array([[int(h[i:i + 2], 16) for i in (0, 2, 4)] for h in PAL], float)
BAYER = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], float).reshape(4, 4)
DITHER = 4   # times render.js's strength (its BAY is (v / 16 - .47) * .032 of the 0..1 range)


def lut():
    lv = np.arange(32) * 8.2
    r, g, b = np.meshgrid(lv, lv, lv, indexing='ij')
    d = ((RGB[:, 0, None, None, None] - r) ** 2 * 2 + (RGB[:, 1, None, None, None] - g) ** 2 * 4
         + (RGB[:, 2, None, None, None] - b) ** 2 * 3)
    return d.argmin(0)


LUT = lut()


def quantize(a):
    """a: float RGB 0..255, h x w x 3. Returns palette indices, h x w."""
    h, w = a.shape[:2]
    bay = np.tile((BAYER / 16 - .47) * .032 * DITHER, (h // 4 + 1, w // 4 + 1))[:h, :w]
    lvl = np.clip(np.floor(a / 255 * 31 + bay[..., None] * 31 + .5), 0, 31).astype(int)
    return LUT[lvl[..., 0], lvl[..., 1], lvl[..., 2]]


# ---------- touch-ups, on the shrunk picture before the palette ----------
def ramp(lum, stops):
    """Colour each pixel by its brightness (0..1) along a list of (at, rgb) stops."""
    xs = [s[0] for s in stops]
    return np.stack([np.interp(lum, xs, [s[1][c] for s in stops]) for c in range(3)], -1)


def lum(a):
    return (a[..., 0] * .3 + a[..., 1] * .55 + a[..., 2] * .15) / 255


def tower(a):
    # The beacon box on the roof glows p(Loom)'s idle-eye orange, not the cool blue the picture has: the souls drift
    # into its colour (the eye colour arc). Only the blue-white glass and its halo change; the night sky's blues stay.
    y0, y1, x0, x1 = 22, 62, 200, 282
    box = a[y0:y1, x0:x1]
    blue = (box[..., 2] > box[..., 0] + 10) & (lum(box) >= .22)
    box[blue] = ramp(lum(box[blue]) ** .8, [(0, (40, 14, 6)), (.35, (150, 52, 12)), (.65, (232, 90, 22)), (.85, (255, 170, 70)), (1, (255, 236, 190))])
    # the halo: sky a little brighter than the night around it, warmed toward the same orange by how much brighter
    halo = (box[..., 2] > box[..., 0] + 10) & ~blue & (lum(box) < .22)
    k = np.clip((lum(box[halo]) - .09) / .12, 0, 1)[:, None]
    box[halo] = box[halo] * (1 - k) + np.array([110, 40, 18]) * k
    # The 48th Floor: of the 14 rows of windows, the 7th from the bottom (row 8 from the top, y 273 to 283), a dim
    # red-orange, darker and redder than the warm windows around it (the eye's attack red). The game flickers it on top.
    y0, y1, x0, x1 = 270, 287, 198, 282
    box = a[y0:y1, x0:x1]
    lit = (box[..., 0] > 120) & (box[..., 0] > box[..., 2] + 40)
    box[lit] = ramp(lum(box[lit]), [(0, (30, 6, 8)), (.4, (96, 20, 16)), (.7, (170, 40, 20)), (1, (220, 80, 34))])
    return a


EDITS = {5: tower}
SIZES = {5: (480, 540)}


def still(src, n):
    w, h = SIZES.get(n, (480, 270))
    a = np.asarray(Image.open(src).convert('RGB').resize((w, h), Image.BOX), float).copy()
    if n in EDITS:
        a = EDITS[n](a)
    return quantize(a)


def image(idx):
    im = Image.fromarray(RGB[idx].astype(np.uint8), 'RGB')
    return im


# the Rugfather's frames the intro needs (portrait.js has the front), as (strip, cell)
# (strip, cell, scale): scale 1 is the art's own pixel grid; anything else is averaged down to that share of it
SPRITES = {'reach': ('alive', 7, 1), 'heap': ('dead', 0, 1)}


def sprite(src, name):
    strip, cell, scale = SPRITES[name]
    im = Image.open(src / f'{strip}.png').convert('RGBA').crop((cell * 256, 0, cell * 256 + 256, 256))
    if scale == 1:
        a = np.asarray(im)[::2, ::2].copy()             # drawn at 2x: every other pixel is the art
    else:
        # averaged down, colour weighted by coverage so the edges don't go dark
        n = round(128 * scale)
        f = np.asarray(im, float)
        f[..., :3] *= f[..., 3:] / 255
        sm = np.asarray(Image.fromarray(f.astype(np.uint8), 'RGBA').resize((n, n), Image.BOX), float)
        cov = sm[..., 3:] / 255
        sm[..., :3] = np.where(cov > 0, sm[..., :3] / np.maximum(cov, 1e-6), 0)
        a = np.clip(sm, 0, 255).astype(np.uint8)
    a[a[..., 3] < 128] = 0
    a[..., 3][a[..., 3] >= 128] = 255
    ys, xs = np.nonzero(a[..., 3])
    return Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')


def webp(im):
    b = io.BytesIO()
    im.save(b, 'WEBP', lossless=True, quality=100, method=6, exact=True)
    return b.getvalue()


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    src = Path(args[0])
    png = Path(args[args.index('--png') + 1]) if '--png' in args else None
    parts, total = [], 0
    for n in range(1, 7):
        im = image(still(src / f'still{n}.png', n))
        data = webp(im)
        total += len(data)
        parts.append(f"    {{ w: {im.width}, h: {im.height}, src: 'data:image/webp;base64,{base64.b64encode(data).decode()}' }}")
        if png:
            png.mkdir(parents=True, exist_ok=True)
            im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(png / f'still{n}.png')
        print(f'still {n}: {im.width}x{im.height}, {len(data)} bytes')
    sprites = []
    for name in SPRITES:
        im = sprite(src, name)
        data = webp(im)
        total += len(data)
        sprites.append(f"    {name}: {{ w: {im.width}, h: {im.height}, src: 'data:image/webp;base64,{base64.b64encode(data).decode()}' }}")
        if png:
            im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(png / f'{name}.png')
        print(f'{name}: {im.width}x{im.height}, {len(data)} bytes')
    js = ("// The intro's six stills: the owner's pictures, shrunk to the game's picture and its 64 colours by\n"
          "// tools/unruggabull-ii/intro/stills.py. The source pictures aren't kept in the repo; this data is the art.\n"
          "// Classic script: UnrugIntroStills.stills[i] is { w, h, img } for still i + 1, in picture pixels (480 x 270; still 5\n"
          "// is 480 x 540); UnrugIntroStills.sprites holds the Rugfather's frames the intro needs besides portrait.js.\n"
          "var UnrugIntroStills = (function () {\n  'use strict';\n"
          "  const load = s => { const img = new Image(); img.src = s.src; return { w: s.w, h: s.h, img }; };\n"
          "  const stills = [\n" + ',\n'.join(parts) + "\n  ].map(load);\n"
          "  const sprites = {\n" + ',\n'.join(sprites) + "\n  };\n"
          "  for (const k in sprites) sprites[k] = load(sprites[k]);\n"
          "  return { stills, sprites };\n})();\n")
    OUT.write_text(js)
    print(f'{OUT.relative_to(ROOT)}: {len(js)} bytes (pictures {total} bytes)')


if __name__ == '__main__':
    main()
