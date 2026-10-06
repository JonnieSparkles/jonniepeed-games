"""Build 1200x630 social preview cards into site/assets/og/.

Run from the repo root:
    python3 tools/og/make.py

Needs Playwright with Chromium (pip install playwright && python3 -m playwright install chromium).
Pixel games are captured live from their own canvas, so the cards stay in sync with the art.
To add a game: add an entry to GAMES below and run the script again.
"""
import base64
import pathlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
SITE = ROOT / "site"
OUT = SITE / "assets" / "og"
FONT_DIR = SITE / "assets" / "fonts"


def font_uri(name):
    return "data:font/woff2;base64," + base64.b64encode((FONT_DIR / name).read_bytes()).decode()



# slug, title, tagline, call to action, setup JS run on the page before capturing the canvas
GAMES = [
    ("thimbleful", "Thimbleful", "Catch the drips before the sill gets soaked.", "Play in your browser",
     "document.getElementById('go').click(); score=16; el=20; hud();"),
    ("windowsill", "Windowsill", "A tiny explorer's garden at sunset.", "Animated pixel scene", ""),
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
    page.goto((SITE / slug / "index.html").as_uri())
    page.wait_for_timeout(400)
    if setup:
        page.evaluate(setup)
        page.wait_for_timeout(2600)
    else:
        page.wait_for_timeout(1500)
    return page.evaluate("document.getElementById('c').toDataURL('image/png')")


def game_card(scene_uri, title, tagline, cta):
    mark = data_uri(SITE / "assets" / "mark-pixel-dark.png")
    return f"""<!doctype html><html><head><style>{BASE_CSS}
body{{background:#2a2140;color:#f6e7c8;font-family:'Pixelify Sans',sans-serif;display:grid;grid-template-columns:minmax(0,1fr) 672px;align-items:center;gap:44px;padding:0 56px 0 64px}}
.txt{{display:grid;gap:22px}}
.studio{{display:flex;align-items:center;gap:14px;font-family:'Silkscreen',monospace;font-size:20px;letter-spacing:.1em;text-transform:uppercase;color:#b6a6cc}}
.studio img{{width:40px;height:44px;image-rendering:pixelated}}
h1{{font-family:'Silkscreen',monospace;font-weight:400;font-size:52px;line-height:1;color:#f5c32c}}
p{{font-size:32px;line-height:1.3;color:#f6e7c8}}
.play{{font-family:'Silkscreen',monospace;font-size:20px;letter-spacing:.08em;text-transform:uppercase;color:#7fd0ff}}
.scene{{width:672px;height:504px;image-rendering:pixelated;border-radius:16px;box-shadow:0 0 0 4px #3b2f58}}
</style></head><body>
<div class="txt"><div class="studio"><img src="{mark}">Jonniepeed Games</div><h1>{title}</h1><p>{tagline}</p><div class="play">{cta}</div></div>
<img class="scene" src="{scene_uri}">
</body></html>"""


def index_card():
    """Studio card: logo plus tagline only, so it never lists games that go stale."""
    dots = "".join(f'<i style="background:{c}"></i>' for c in ["#1e9bf0", "#5fbf1e", "#ff7a14", "#ec188c", "#8a2be2"])
    return f"""<!doctype html><html><head><style>{BASE_CSS}
body{{background:#ffffff;color:#17141f;font-family:'Pixelify Sans',sans-serif;display:grid;grid-template-columns:620px 1fr;align-items:center;gap:36px;padding:0 72px 0 40px}}
.logo{{width:620px;height:auto}}
.side{{display:grid;gap:28px}}
p{{font-size:46px;line-height:1.2}}
.dots{{display:flex;gap:14px}}
.dots i{{display:block;width:22px;height:22px}}
</style></head><body>
<img class="logo" src="{{LOGO_URI}}">
<div class="side"><p>Small games you play right in your browser.</p><div class="dots">{dots}</div></div>
</body></html>"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 800, "height": 900})
        scenes = {}
        for slug, title, tagline, cta, setup in GAMES:
            scenes[slug] = capture_canvas(page, slug, setup)
        card = browser.new_page(viewport={"width": 1200, "height": 630})
        for slug, title, tagline, cta, _ in GAMES:
            card.set_content(game_card(scenes[slug], title, tagline, cta))
            card.evaluate('document.fonts.ready'); card.wait_for_timeout(300)
            card.screenshot(path=str(OUT / f"{slug}.png"))
            print("wrote", OUT / f"{slug}.png")
        logo_uri = "data:image/webp;base64," + base64.b64encode((SITE / "assets" / "logo.webp").read_bytes()).decode()
        card.set_content(index_card().replace("{LOGO_URI}", logo_uri))
        card.evaluate('document.fonts.ready'); card.wait_for_timeout(300)
        card.screenshot(path=str(OUT / "index.png"))
        print("wrote", OUT / "index.png")
        browser.close()


if __name__ == "__main__":
    main()
