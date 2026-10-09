"""Render a game's trailer text layers (tests/<slug>/trailer/layers.html) to transparent PNGs.

layers.html is a full page at the trailer's size with its own styles and scripts. Each <template id="name"> in it
becomes layers/name.png: the template's content is put into #L and screenshotted with a transparent background.
{{SITE}} in the page becomes the local site's address, so it can use the game's self-hosted fonts and images.
"""
import json
import os


def render(pw, base_url, game_dir, cfg, out_dir, log=print):
    out_dir.mkdir(parents=True, exist_ok=True)
    w, h = cfg.get('size', [1920, 1080])
    html = (game_dir / 'layers.html').read_text().replace('{{SITE}}', base_url)
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM'))
    page = browser.new_page(viewport={'width': w, 'height': h})
    page.goto(base_url + '404.html')          # same origin as the site, so its fonts load
    page.set_content(html)
    page.evaluate('document.fonts.ready.then(() => 1)')
    page.wait_for_timeout(500)
    names = page.evaluate('[...document.querySelectorAll("template[id]")].map(t => t.id)')
    boxes = {}
    for name in names:
        page.evaluate('id => { const L = document.getElementById("L"); L.replaceChildren(document.getElementById(id).content.cloneNode(true)); }', name)
        page.evaluate('document.fonts.ready.then(() => 1)')
        page.wait_for_timeout(200)
        boxes[name] = page.evaluate('(() => { const r = document.getElementById("L").firstElementChild.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); })()')
        page.screenshot(path=str(out_dir / (name + '.png')), omit_background=True)
    browser.close()
    (out_dir / 'boxes.json').write_text(json.dumps(boxes))
    log('layers: ' + ', '.join('%s %s' % (k, v) for k, v in boxes.items()))
    return boxes
