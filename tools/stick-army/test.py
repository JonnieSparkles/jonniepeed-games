"""Browser regression tests. Serve site/ on port 8000, then run this file.
Requires Python Playwright; CHROMIUM selects a system browser.
The test-only bridge is injected into the response, never shipped in the game.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM'))
    page = browser.new_page(viewport={'width': 1000, 'height': 900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    source = (ROOT / 'site/stick-army/game.js').read_text()
    source = source.replace('  start();', "  window.armyTest = function (code) { return eval(code); };\n  start();")
    page.route('**/stick-army/game.js*', lambda route: route.fulfill(body=source, content_type='application/javascript'))
    page.goto(os.environ.get('SITE_URL', 'http://127.0.0.1:8000') + '/stick-army/index.html')
    page.clock.install()
    for case in sorted(Path(__file__).parent.glob('case-*.js')):
        page.evaluate('(code) => armyTest(code)', case.read_text())
        print('PASS', case.stem)
    assert not errors, errors
    browser.close()
