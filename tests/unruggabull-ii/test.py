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
            zone = page.locator('#stickzone')
            assert zone.is_visible(), f'{name}: the thumb stick shows'
            zb = zone.bounding_box()
            assert zb['y'] + zb['height'] <= size[1] + 1 and zb['x'] >= 0 and zb['width'] >= 120 and zb['height'] >= 100, f'{name}: thumb stick on screen and roomy ({zb})'
            for k in ('shoot', 'slash'):
                pad = page.locator(f'.pad[data-k="{k}"]')
                assert pad.is_visible(), f'{name}: {k} pad shows'
                box = pad.bounding_box()
                assert box['y'] + box['height'] <= size[1] + 1 and box['x'] >= 0 and box['x'] + box['width'] <= size[0] + 1, f'{name}: {k} pad on screen'
            cdp = context.new_cdp_session(page)
            def touch_event(kind, x, y, tid=1):
                cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [] if kind == 'touchEnd' else [{'x': x, 'y': y, 'id': tid}]})
            # the stick: land anywhere in its zone, slide right then left, flick up to jump, hold down to crouch
            cx, cy = zb['x'] + zb['width'] / 2, zb['y'] + zb['height'] / 2
            page.evaluate("unrugTest('bull.u = 0; bull.inv = 1e9')")
            touch_event('touchStart', cx, cy)
            touch_event('touchMove', cx + 36, cy)
            page.wait_for_timeout(250)
            moved = page.evaluate("unrugTest('bull.u')")
            assert moved > 0, f'{name}: sliding the stick right moves right'
            touch_event('touchMove', cx - 36, cy)
            page.wait_for_timeout(250)
            assert page.evaluate("unrugTest('bull.u')") < moved, f'{name}: sliding it left moves left'
            touch_event('touchMove', cx, cy)
            page.wait_for_timeout(50)
            touch_event('touchMove', cx, cy - 40)
            page.wait_for_timeout(60)
            assert page.evaluate("unrugTest('bull.jh')") > 0, f'{name}: flicking up jumps'
            touch_event('touchMove', cx, cy)
            page.wait_for_timeout(700)
            touch_event('touchMove', cx, cy + 40)
            page.wait_for_timeout(60)
            assert page.evaluate("unrugTest('bull.crouch')"), f'{name}: holding down crouches'
            touch_event('touchEnd', 0, 0)
            page.wait_for_timeout(30)
            assert not page.evaluate("unrugTest('keys.padLeft || keys.padRight || keys.padDown')"), f'{name}: lifting the thumb lets go'
            # a thumb in the gap between Shoot and Slash still counts
            sh, sl = page.locator('.pad[data-k="shoot"]').bounding_box(), page.locator('.pad[data-k="slash"]').bounding_box()
            if sl['y'] >= sh['y'] + sh['height'] - 1:
                gx, gy = sh['x'] + sh['width'] / 2, (sh['y'] + sh['height'] + sl['y']) / 2
            else:
                gx, gy = (sh['x'] + sh['width'] + sl['x']) / 2, sh['y'] + sh['height'] / 2
            page.evaluate("unrugTest('bull.cd = 0; bull.slash = -1; R.events.shots = 0; R.fireT = 0')")
            touch_event('touchStart', gx, gy)
            page.wait_for_timeout(100)
            assert page.evaluate("unrugTest('bull.slash >= 0 || R.events.shots > 0')"), f'{name}: a touch between Shoot and Slash counts'
            touch_event('touchEnd', 0, 0)
            if name == 'phone portrait':
                # the stage sits right on top of the controls, and the buttons are big
                stage = page.locator('.stage').bounding_box()
                top = min(zb['y'], page.locator('.pad[data-k="shoot"]').bounding_box()['y'])
                assert 0 <= top - (stage['y'] + stage['height']) <= 40, f'{name}: the stage sits just above the controls'
                assert all(page.locator(f'.pad[data-k="{k}"]').bounding_box()['width'] >= 100 for k in ('shoot', 'slash')), f'{name}: big buttons'
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
