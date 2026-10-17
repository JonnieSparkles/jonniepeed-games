"""Build each game's tab icons from its pixel art in brand/favicons/.

Every game has its own favicon (see the README's "Game favicons" standard and docs/guides/06-favicons.md).
Its source is a square 16x16 PNG, brand/favicons/<slug>.png, drawn full bleed: fill every pixel, corners
included. An optional brand/favicons/<slug>-32.png carries detail that only fits at 32 px (Stick Army's rifle);
without one, the 32 px icon is the 16 px art doubled.

For each source this writes, into site/<slug>/:
    favicon.ico           16 and 32 px, corners rounded off (the 16 px is the hand-drawn art, never a downscale)
    favicon-32.png        the 32 px icon, corners rounded off
    apple-touch-icon.png  180 px, full bleed and opaque (iOS rounds the corners itself)

Run from the repo root, then stamp:
    python3 tools/favicons/make.py              # every game with a source
    python3 tools/favicons/make.py --game thimbleful
    python3 tools/stamp.py

A source whose site/<slug>/ folder doesn't exist is reported and skipped, never created.
"""
import argparse
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
SITE = ROOT / "site"
SRC = ROOT / "brand" / "favicons"

# The pixels cut from each corner of a 16 px icon; at 32 px each becomes a 2x2 block.
CORNERS = [(0, 0), (1, 0), (0, 1), (15, 0), (14, 0), (15, 1),
           (0, 15), (1, 15), (0, 14), (15, 15), (14, 15), (15, 14)]
TOUCH = 180


def load(path, size):
    im = Image.open(path).convert("RGBA")
    if im.size != (size, size):
        sys.exit(f"{path.relative_to(ROOT)} is {im.size[0]}x{im.size[1]}; it must be {size}x{size}")
    if im.getchannel("A").getextrema()[0] < 255:
        sys.exit(f"{path.relative_to(ROOT)} has transparent pixels; draw it full bleed (the tool rounds the corners)")
    return im


def rounded(im):
    out = im.copy()
    k = im.size[0] // 16
    for x, y in CORNERS:
        for j in range(k):
            for i in range(k):
                out.putpixel((x * k + i, y * k + j), (0, 0, 0, 0))
    return out


def touch(im):
    # Scale up by a whole number past 180, then crop the middle: every pixel stays square and sharp,
    # and only the outer ring of art pixels comes out a little thinner.
    k = -(-TOUCH // im.size[0])
    big = im.resize((im.size[0] * k, im.size[1] * k), Image.NEAREST)
    m = (big.size[0] - TOUCH) // 2
    return big.crop((m, m, m + TOUCH, m + TOUCH)).convert("RGB")


def build(slug):
    folder = SITE / slug
    if not (folder / "index.html").is_file():
        print(f"{slug}: no site/{slug}/index.html, skipped")
        return
    small = load(SRC / f"{slug}.png", 16)
    big_src = SRC / f"{slug}-32.png"
    big = load(big_src, 32) if big_src.is_file() else small.resize((32, 32), Image.NEAREST)
    ico32, ico16 = rounded(big), rounded(small)
    ico32.save(folder / "favicon-32.png", optimize=True)
    ico32.save(folder / "favicon.ico", sizes=[(16, 16), (32, 32)], append_images=[ico16])
    touch(big).save(folder / "apple-touch-icon.png", optimize=True)
    print(f"{slug}: favicon.ico, favicon-32.png, apple-touch-icon.png")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--game", help="only this game's slug")
    args = ap.parse_args()
    slugs = sorted(p.stem for p in SRC.glob("*.png") if not p.stem.endswith("-32"))
    if args.game:
        if args.game not in slugs:
            sys.exit(f"no brand/favicons/{args.game}.png")
        slugs = [args.game]
    for slug in slugs:
        build(slug)


if __name__ == "__main__":
    main()
