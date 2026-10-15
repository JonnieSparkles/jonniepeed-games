"""The title screen's painting, from the owner's ChatGPT picture to data the game draws (Oct 2026).

The picture is the first game's view down RugCo Alley a night later (title-plan.md). It is cropped to 3:4 if it isn't,
shrunk to 480x640 with a box filter and mapped to the game's 64 colours with the intro's dither (quantize in
../intro/stills.py, so the title matches the intro's stills exactly), then saved as a lossless WebP inside
site/unruggabull-ii/title-art.js. The source picture is not kept in the repo; it's the owner's.

    python3 tools/unruggabull-ii/title/art.py SRC.png             writes site/unruggabull-ii/title-art.js
    python3 tools/unruggabull-ii/title/art.py SRC.png --png OUT   also saves the result, 2x, for looking at

Needs Pillow and numpy.
"""
import base64
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'intro'))
from stills import PAL, quantize  # noqa: E402

ROOT = HERE.parents[2]
OUT = ROOT / 'site/unruggabull-ii/title-art.js'
W, H = 480, 640


def painting(src):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    if abs(h / w - H / W) > .01:   # cover-crop to 3:4, keeping the middle
        if h / w > H / W:
            ch = round(w * H / W); top = (h - ch) // 2; im = im.crop((0, top, w, top + ch))
        else:
            cw = round(h * W / H); left = (w - cw) // 2; im = im.crop((left, 0, left + cw, h))
    a = np.asarray(im.resize((W, H), Image.BOX), float)
    rgb = np.array([[int(p[i:i + 2], 16) for i in (0, 2, 4)] for p in PAL], np.uint8)[quantize(a)]
    return Image.fromarray(rgb, 'RGB')


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    im = painting(args[0])
    b = io.BytesIO()
    im.save(b, 'WEBP', lossless=True, quality=100, method=6, exact=True)
    OUT.write_text('// The title screen\'s painting: the owner\'s picture of RugCo Alley, shrunk to 480 x 640 and the game\'s 64 colours\n'
                   '// by tools/unruggabull-ii/title/art.py. The source picture isn\'t kept in the repo; this data is the art.\n'
                   '// Classic script: UnrugTitleArt is { w, h, src }, a lossless WebP data URI. Don\'t edit by hand.\n'
                   f"var UnrugTitleArt = {{ w: {W}, h: {H}, src: 'data:image/webp;base64,{base64.b64encode(b.getvalue()).decode()}' }};\n")
    print('wrote', OUT.relative_to(ROOT), len(b.getvalue()), 'bytes')
    if '--png' in args:
        out = Path(args[args.index('--png') + 1]); out.mkdir(parents=True, exist_ok=True)
        im.resize((W * 2, H * 2), Image.NEAREST).save(out / 'title-art.png')


if __name__ == '__main__':
    main()
