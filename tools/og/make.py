"""Build 1200x630 cards into site/<slug>/og.png and site/assets/studio/og.png.

Run from the repo root:
    python3 tools/og/make.py

Optional: CHROMIUM=/path/to/chromium and SITE_URL=http://127.0.0.1:8000
(use SITE_URL when the browser disallows file:// URLs).

Needs Playwright with Chromium (pip install playwright && python3 -m playwright install chromium).
Pixel games are captured live from their own canvas, so the cards and the index thumbnails
(site/<slug>/thumb.png) stay in sync with the art. Games that aren't pixel art are captured
as a page screenshot instead (pass {"screenshot": True} as the last field); their thumbnail is a WebP.
Games with cover art use it instead of a capture (pass {"cover": (file, position)}, with the file in
brand/covers/). One 4:3 crop of the cover makes both the WebP thumbnail and the card's picture, and the
card leaves out the title because the cover already has it lettered in.
Use --game stick-army to regenerate only that game's thumbnail and card.
To add a game: add an entry to GAMES below and run the script again.
Entries without an existing game index are reported and skipped, never recreated.
"""
import base64
import argparse
import pathlib
import os

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
SITE = ROOT / "site"
OUT = SITE / "assets" / "studio"
FONT_DIR = SITE / "assets" / "fonts"
COVERS = ROOT / "brand" / "covers"


def font_uri(name):
    return "data:font/woff2;base64," + base64.b64encode((FONT_DIR / name).read_bytes()).decode()



# slug, title, tagline, call to action, setup JS run on the page before capturing, optional options:
#   screenshot: capture the whole page (4:3 viewport) instead of the #c canvas
#   selector/crop: capture a region of an element; crop is (x, y, width, height), fractions of its bounds
#   viewport: screenshot viewport (width, height), before device scale factor 2
#   title_px:   card title size, for long names
#   cover: (file in brand/covers/, position) uses cover art instead of a capture, so setup can be None.
#          The 4:3 crop sits at position across the cover: 0 the left edge, 0.5 centred, 1 the right edge.
GAMES = [
    ("stick-army", "Stick Army", "Pop chutes. Catch recruits. Defend the notebook.", "Play in your browser",
     None, {"cover": ("stick-army.png", 0.5)}),
    ("thimbleful", "Thimbleful", "Plant a seed. Catch the drips. Grow a sunflower.", "Play in your browser",
     None, {"cover": ("thimbleful.png", 0.5)}),
    ("dont-step-on-a-crack", "Don't Step on a Crack", "Every crack you step on folds Mom up a little more.", "Play in your browser",
     # the Mom Cam is in the cover's top-left corner, so the crop sits near the left edge
     None, {"cover": ("dont-step-on-a-crack.png", 0.18)}),
]

BASE_CSS = f"""
@font-face{{font-family:'Silkscreen';src:url('{font_uri("silkscreen-latin-400-normal.woff2")}') format('woff2')}}
@font-face{{font-family:'Pixelify Sans';font-weight:400;src:url('{font_uri("pixelify-sans-latin-400-normal.woff2")}') format('woff2')}}
*{{box-sizing:border-box;margin:0}}
html,body{{width:1200px;height:630px;overflow:hidden}}
"""


def data_uri(path):
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def capture_canvas(page, slug, setup):
    page.goto(os.environ["SITE_URL"].rstrip("/") + "/" + slug + "/index.html" if os.environ.get("SITE_URL") else (SITE / slug / "index.html").as_uri())
    page.wait_for_timeout(400)
    if setup:
        page.evaluate(setup)
        page.wait_for_timeout(2600)
    else:
        page.wait_for_timeout(1500)
    return page.evaluate("document.getElementById('c').toDataURL('image/png')")


def capture_page(browser, slug, setup, wait_ms=1700, selector=None, crop=None, viewport=(640, 480)):
    """Screenshot the page itself, for games drawn with smooth graphics rather than a pixel canvas."""
    page = browser.new_page(viewport={"width": viewport[0], "height": viewport[1]}, device_scale_factor=2)
    page.goto(os.environ["SITE_URL"].rstrip("/") + "/" + slug + "/index.html" if os.environ.get("SITE_URL") else (SITE / slug / "index.html").as_uri())
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(1200)
    if setup:
        page.evaluate(setup)
    page.wait_for_timeout(wait_ms)
    if selector:
        target = page.locator(selector)
        if crop:
            box = target.bounding_box()
            x, y, width, height = crop
            png = page.screenshot(clip={"x": box["x"] + box["width"] * x,
                                        "y": box["y"] + box["height"] * y,
                                        "width": box["width"] * width,
                                        "height": box["height"] * height})
        else:
            png = target.screenshot()
    else:
        png = page.screenshot()
    page.close()
    return "data:image/png;base64," + base64.b64encode(png).decode()


def crop_cover(page, name, position):
    """Crop cover art from brand/covers/ to 4:3 at full resolution. position runs from 0 (left edge) to 1 (right edge)."""
    path = COVERS / name
    mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}[path.suffix.lower()]
    src = f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()
    return page.evaluate("""([u, pos]) => new Promise(r => { const i = new Image(); i.onload = () => {
        const w = Math.min(i.width, Math.round(i.height * 4 / 3)), h = Math.round(w * 3 / 4);
        const k = document.createElement('canvas'); k.width = w; k.height = h;
        k.getContext('2d').drawImage(i, Math.round((i.width - w) * pos), Math.round((i.height - h) / 2), w, h, 0, 0, w, h);
        r(k.toDataURL('image/png')); }; i.src = u; })""", [src, position])


def game_card(scene_uri, title, tagline, cta, pixel=True, title_px=52):
    mark = data_uri(SITE / "assets" / "mark-pixel-dark.png")
    return f"""<!doctype html><html><head><style>{BASE_CSS}
body{{background:#2a2140;color:#f6e7c8;font-family:'Pixelify Sans',sans-serif;display:grid;grid-template-columns:minmax(0,1fr) 672px;align-items:center;gap:44px;padding:0 56px 0 64px}}
.txt{{display:grid;gap:22px}}
.studio{{display:flex;align-items:center;gap:14px;font-family:'Silkscreen',monospace;font-size:20px;letter-spacing:.1em;text-transform:uppercase;color:#b6a6cc}}
.studio img{{width:40px;height:44px;image-rendering:pixelated}}
h1{{font-family:'Silkscreen',monospace;font-weight:400;font-size:{title_px}px;line-height:1.05;color:#f5c32c}}
p{{font-size:32px;line-height:1.3;color:#f6e7c8}}
.play{{font-family:'Silkscreen',monospace;font-size:20px;letter-spacing:.08em;text-transform:uppercase;color:#7fd0ff}}
.scene{{width:672px;height:504px;image-rendering:{'pixelated' if pixel else 'auto'};border-radius:16px;box-shadow:0 0 0 4px #3b2f58}}
</style></head><body>
<div class="txt"><div class="studio"><img src="{mark}">JonniePeed Games</div>{f'<h1>{title}</h1>' if title else ''}<p>{tagline}</p><div class="play">{cta}</div></div>
<img class="scene" src="{scene_uri}">
</body></html>"""


def index_card():
    """Studio card: just the logo, centred, with confetti squares from the logo palette.
    No tagline and no game list, so it never goes stale."""
    squares = [(140, 120, "#1e9bf0", 0), (1010, 140, "#ec188c", 45), (180, 470, "#5fbf1e", 45), (1040, 450, "#8a2be2", 0), (1090, 300, "#ff7a14", 45), (110, 300, "#ffcc00", 0)]
    sq = "".join(f'<i style="left:{x}px;top:{y}px;background:{c};transform:rotate({r}deg)"></i>' for x, y, c, r in squares)
    return f"""<!doctype html><html><head><style>{BASE_CSS}
body{{background:#ffffff;display:grid;place-items:center;position:relative}}
.logo{{height:560px;width:auto}}
i{{position:absolute;display:block;width:26px;height:26px}}
</style></head><body>
<img class="logo" src="{{LOGO_URI}}">{sq}
</body></html>"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game', choices=[game[0] for game in GAMES],
                        help='Regenerate only this game; keep other games and the studio card unchanged')
    args = parser.parse_args()
    games = [game for game in GAMES if not args.game or game[0] == args.game]
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM"))
        page = browser.new_page(viewport={"width": 800, "height": 900})
        scenes = {}
        for slug, title, tagline, cta, setup, *more in games:
            if not (SITE / slug / "index.html").is_file():
                print("skipped missing game", slug)
                continue
            opts = more[0] if more else {}
            if opts.get("cover") or opts.get("screenshot"):
                if opts.get("cover"):
                    scenes[slug] = crop_cover(page, *opts["cover"])
                else:
                    scenes[slug] = capture_page(browser, slug, setup, wait_ms=opts.get("wait_ms", 1700),
                                                selector=opts.get("selector"), crop=opts.get("crop"),
                                                viewport=opts.get("viewport", (640, 480)))
                # 768x576 WebP thumbnail for the index card
                thumb = page.evaluate("""(u) => new Promise(r => { const i = new Image(); i.onload = () => {
                    const k = document.createElement('canvas'); k.width = 768; k.height = 576;
                    const x = k.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, k.width, k.height);
                    r(k.toDataURL('image/webp', 0.86)); }; i.src = u; })""", scenes[slug])
                name = "thumb.webp"
            else:
                scenes[slug] = capture_canvas(page, slug, setup)
                # 4x nearest-neighbour thumbnail for the index card
                thumb = page.evaluate("""(u) => new Promise(r => { const i = new Image(); i.onload = () => {
                    const k = document.createElement('canvas'); k.width = i.width * 4; k.height = i.height * 4;
                    const x = k.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(i, 0, 0, k.width, k.height);
                    r(k.toDataURL('image/png')); }; i.src = u; })""", scenes[slug])
                name = "thumb.png"
            (SITE / slug / name).write_bytes(base64.b64decode(thumb.split(",")[1]))
            print("wrote", SITE / slug / name)
        card = browser.new_page(viewport={"width": 1200, "height": 630})
        for slug, title, tagline, cta, _, *more in games:
            if slug not in scenes:
                continue
            opts = more[0] if more else {}
            # a cover already has the title lettered in, so the card leaves it out
            card.set_content(game_card(scenes[slug], None if opts.get("cover") else title, tagline, cta,
                                       pixel=not (opts.get("screenshot") or opts.get("cover")), title_px=opts.get("title_px", 52)))
            card.evaluate('document.fonts.ready'); card.wait_for_timeout(300)
            card.screenshot(path=str(SITE / slug / "og.png"))
            print("wrote", SITE / slug / "og.png")
        if not args.game:
            logo_uri = "data:image/png;base64," + base64.b64encode((ROOT / "brand" / "logo.png").read_bytes()).decode()
            card.set_content(index_card().replace("{LOGO_URI}", logo_uri))
            card.evaluate('document.fonts.ready'); card.wait_for_timeout(300)
            card.screenshot(path=str(OUT / "og.png"))
            print("wrote", OUT / "og.png")
        browser.close()


if __name__ == "__main__":
    main()
