"""Browser checks for Unruggabull II. Serve site/ on port 8000, then run python3 tests/unruggabull-ii/test.py.
Requires Python Playwright; CHROMIUM selects a system browser, SITE_URL another server.
The test-only bridge is injected into the response, never shipped in the game.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
URL = os.environ.get('SITE_URL', 'http://127.0.0.1:8000').rstrip('/') + '/unruggabull-ii/'
source = (ROOT / 'site/unruggabull-ii/game.js').read_text()
assert source.count('  start();') == 1, 'game.js needs exactly one "  start();" line for the test bridge'
source = source.replace('  start();', "  window.unrugTest = function (code) { return eval(code); };\n  start();")


def open_page(browser, **ctx):
    context = browser.new_context(**ctx)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/unruggabull-ii/game.js*', lambda route: route.fulfill(body=source, content_type='application/javascript'))
    page.goto(URL)
    return context, page, errors


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM'))

    # Game rules, driven tick by tick through the bridge with the page clock frozen.
    context, page, errors = open_page(browser, viewport={'width': 1000, 'height': 800})
    page.clock.install()
    assert 'touch-action:manipulation' in page.content(), 'page sets touch-action:manipulation'
    for case in sorted(Path(__file__).parent.glob('case-*.js')):
        page.evaluate('(code) => unrugTest(code)', case.read_text())
        print('PASS', case.stem)
    assert not errors, errors
    context.close()

    # Layout: desktop, phone portrait and phone landscape. Phones go full screen on Start and show the pads.
    for name, size, touch in [('desktop', (1280, 800), False), ('phone portrait', (390, 844), True), ('phone landscape', (844, 390), True)]:
        context, page, errors = open_page(browser, viewport={'width': size[0], 'height': size[1]}, has_touch=touch, is_mobile=touch)
        page.wait_for_timeout(300)
        width = page.evaluate('document.documentElement.scrollWidth')
        assert width <= size[0], f'{name}: no sideways scroll ({width}px)'
        assert page.locator('#go').is_visible(), f'{name}: Start is visible'
        page.locator('#go').click()
        page.wait_for_timeout(300)
        assert page.locator('#crawl').is_visible(), f'{name}: the first Start tells the story'
        page.locator('#skip').click()
        page.wait_for_timeout(300)
        stage = page.locator('.stage').bounding_box()
        assert stage['x'] >= 0 and stage['x'] + stage['width'] <= size[0] + 1, f'{name}: stage fits across'
        if touch:
            assert page.evaluate("document.getElementById('game').classList.contains('full')"), f'{name}: Start goes full screen'
            assert stage['y'] >= 0 and stage['y'] + stage['height'] <= size[1] + 1, f'{name}: stage fits in the screen'
            for k in ('left', 'right', 'jump', 'shoot', 'slash'):
                pad = page.locator(f'.pad[data-k="{k}"]')
                assert pad.is_visible(), f'{name}: {k} pad shows'
                box = pad.bounding_box()
                assert box['y'] + box['height'] <= size[1] + 1 and box['x'] >= 0 and box['x'] + box['width'] <= size[0] + 1, f'{name}: {k} pad on screen'
            # hold right, then slide the same finger onto left
            right, left = page.locator('.pad[data-k="right"]').bounding_box(), page.locator('.pad[data-k="left"]').bounding_box()
            page.evaluate("unrugTest('bull.u = 0')")
            cdp = context.new_cdp_session(page)
            def touch_event(kind, x, y):
                cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [] if kind == 'touchEnd' else [{'x': x, 'y': y, 'id': 1}]})
            touch_event('touchStart', right['x'] + right['width'] / 2, right['y'] + right['height'] / 2)
            page.wait_for_timeout(250)
            moved = page.evaluate("unrugTest('bull.u')")
            assert moved > 0, f'{name}: holding the right pad moves right'
            touch_event('touchMove', left['x'] + left['width'] / 2, left['y'] + left['height'] / 2)
            page.wait_for_timeout(250)
            assert page.evaluate("unrugTest('bull.u')") < moved, f'{name}: sliding onto the left pad moves left'
            touch_event('touchEnd', 0, 0)
            assert not page.evaluate("unrugTest('keys.padLeft || keys.padRight')"), f'{name}: lifting the finger stops'
            shoot = page.locator('.pad[data-k="shoot"]').bounding_box()
            page.evaluate("unrugTest('R.events.shots = 0; R.fireT = 0')")
            touch_event('touchStart', shoot['x'] + shoot['width'] / 2, shoot['y'] + shoot['height'] / 2)
            page.wait_for_timeout(500)
            touch_event('touchEnd', 0, 0)
            assert page.evaluate("unrugTest('R.events.shots')") >= 2, f'{name}: holding Shoot keeps firing'
        else:
            assert not page.locator('#pads').is_visible(), f'{name}: no pads without touch'
            page.keyboard.press('f')
            assert page.evaluate("document.getElementById('game').classList.contains('full')"), f'{name}: F goes full screen'
            stage = page.locator('.stage').bounding_box()
            assert stage['y'] + stage['height'] <= size[1] + 1, f'{name}: full screen stage fits'
        assert not errors, (name, errors)
        print('PASS layout', name)
        context.close()
    browser.close()
