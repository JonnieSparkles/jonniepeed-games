"""The ending's painted still, from the owner's ChatGPT picture to data the game draws (Oct 2026).

Shot 2 of the ending (ending-plan.md) is the RugCo tower at sunrise, the souls leaving its broken roof: the reverse of
the intro's still 5. The picture is shrunk to 480 x 540 (the ending pans up it, as the intro pans up still 5), mapped to
the game's 64 colours with the intro's dither (intro/stills.py: the same palette, lookup and Bayer matrix), and saved
as a lossless WebP inside ending-stills.js. The source picture isn't kept in the repo; it's the owner's (the second,
dusty-dawn version, Oct 14; the project's unruggabull-ii-ending.md has its prompts).

    python3 tools/unruggabull-ii/ending/stills.py tower.png            writes site/unruggabull-ii/ending-stills.js
    python3 tools/unruggabull-ii/ending/stills.py tower.png --png DIR  also saves it as a PNG, 2x, for looking at

Needs Pillow and numpy.
"""
import base64
import importlib.util
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'site/unruggabull-ii/ending-stills.js'
spec = importlib.util.spec_from_file_location('intro_stills', ROOT / 'tools/unruggabull-ii/intro/stills.py')
intro = importlib.util.module_from_spec(spec)
spec.loader.exec_module(intro)


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    png = Path(args[args.index('--png') + 1]) if '--png' in args else None
    a = np.asarray(Image.open(args[0]).convert('RGB').resize((480, 540), Image.BOX), float).copy()
    im = intro.image(intro.quantize(a))
    data = intro.webp(im)
    if png:
        png.mkdir(parents=True, exist_ok=True)
        im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(png / 'tower.png')
    js = ("// The ending's painted still: the owner's picture of RugCo Tower at sunrise, shrunk to 480 x 540 and the game's 64\n"
          "// colours by tools/unruggabull-ii/ending/stills.py. The source picture isn't kept in the repo; this data is the art.\n"
          "// Classic script, loaded when the roof starts: UnrugEndingStills.tower is { w, h, img }, in picture pixels.\n"
          "var UnrugEndingStills = (function () {\n  'use strict';\n"
          "  const load = s => { const img = new Image(); img.src = s.src; return { w: s.w, h: s.h, img }; };\n"
          f"  return {{ tower: load({{ w: {im.width}, h: {im.height}, src: 'data:image/webp;base64,{base64.b64encode(data).decode()}' }}) }};\n"
          "})();\n")
    OUT.write_text(js)
    print(f'tower: {im.width}x{im.height}, {len(data)} bytes; {OUT.relative_to(ROOT)}: {len(js)} bytes')


if __name__ == '__main__':
    main()
