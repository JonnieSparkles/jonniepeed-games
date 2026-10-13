"""The Rugfather's portrait for the 48th Floor's lobby, from the owner's sprite strip.

art/rugfather-strip.png is his strip as he sent it (Oct 13): 13 frames in 256-pixel cells. The portrait is the second
frame (cell 1), trimmed to what's drawn and halved (2 x 2 averaged, alpha premultiplied; his art is drawn in 2 x 2 blocks, so this is its own pixel grid) so it sits in the 480 x 270
picture at a clean scale, finer than the game's own pixels. Writes site/unruggabull-ii/portrait.js; run it again after
changing the strip or the frame:  python3 tools/unruggabull-ii/portrait.py
"""
import base64, io
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CELL, FRAME = 256, 1

strip = Image.open(HERE / 'art' / 'rugfather-strip.png').convert('RGBA')
cell = strip.crop((FRAME * CELL, 0, (FRAME + 1) * CELL, CELL))
# touch-ups, in the frame's own pixels (x, y, w, h, the colour): the owner's "white dot" up by his right ear, buffed
# out with the dark of the pixel above it (Oct 13). The strip itself stays as he sent it.
for x, y, w, h, col in [(178, 44, 2, 2, (16, 8, 11, 255))]:
    for i in range(w):
        for j in range(h): cell.putpixel((x + i, y + j), col)
cell = cell.crop(cell.getbbox())
if cell.width % 2: cell = cell.crop((0, 0, cell.width + 1, cell.height))
half = cell.convert('RGBa').reduce(2).convert('RGBA')
buf = io.BytesIO(); half.save(buf, 'PNG', optimize=True)
b64 = base64.b64encode(buf.getvalue()).decode()
out = ROOT / 'site' / 'unruggabull-ii' / 'portrait.js'
out.write_text(
    "// The Rugfather's portrait (the owner's sprite, frame 2), made by tools/unruggabull-ii/portrait.py. Don't edit by hand.\n"
    "// Classic script: UnrugPortrait.img is the picture, w x h picture pixels; it loads long before the lobby.\n"
    "var UnrugPortrait = (function () {\n"
    "  'use strict';\n"
    "  const img = new Image();\n"
    "  img.src = 'data:image/png;base64," + b64 + "';\n"
    "  return { img, w: %d, h: %d };\n" % half.size +
    "})();\n")
print(out.relative_to(ROOT), half.size, len(b64), 'base64 chars')
