"""Up to four phones in one match, end to end, against a local rooms Worker.

Start both servers first (see docs/games/dont-click-this.md):

    python3 -m http.server 8000 --bind 127.0.0.1 --directory site
    (cd rooms && wrangler dev --local --port 8788)

Then: CHROMIUM=/usr/bin/chromium python3 tests/dont-click-this/test.py

SITE_URL overrides the site address. SCREENSHOTS sets where phone screenshots go (default /tmp/dont-click-this).
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

SITE = os.environ.get('SITE_URL', 'http://127.0.0.1:8000').rstrip('/')
URL = SITE + '/dont-click-this/'
SHOTS = Path(os.environ.get('SCREENSHOTS', '/tmp/dont-click-this'))
SHOTS.mkdir(parents=True, exist_ok=True)
PHONE = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)


def phone(browser, errors):
    context = browser.new_context(**PHONE)
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    return context, page


def dot_xy(page, x, y):
    """Page pixels for a point in the play square (0-1 each way), matching game.js's layout."""
    w, h = page.viewport_size['width'], page.viewport_size['height']
    s = max(120, min(w - 32, h - 120))
    return (w - s) / 2 + x * s, (h - s) / 2 + 6 + y * s


def wait_present(page, n):
    """Waits until the page's top bar shows n players here, counting its own."""
    page.wait_for_function(f"document.querySelectorAll('#roster span:not(.away)').length === {n}", timeout=8000)


def drag(page, x0, y0, x1, y1, steps=12):
    ax, ay = dot_xy(page, x0, y0)
    bx, by = dot_xy(page, x1, y1)
    page.mouse.move(ax, ay)
    page.mouse.down()
    for i in range(1, steps + 1):
        page.mouse.move(ax + (bx - ax) * i / steps, ay + (by - ay) * i / steps)
        page.wait_for_timeout(30)
    page.mouse.up()


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(**({'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}))
        ca, a = phone(browser, errors)
        a.goto(URL)
        assert a.locator('#titleCard').is_visible()
        a.screenshot(path=str(SHOTS / '1-title.png'))
        a.click('#startBtn')
        a.wait_for_selector('#secretCard:not([hidden])')
        words = a.locator('#choices button').all_text_contents()
        assert len(words) == 3 and 'Meatball' in words, words
        a.screenshot(path=str(SHOTS / '1b-secret.png'))
        wrong = next(w for w in words if w != 'Meatball')
        a.click(f'#choices button:text-is("{wrong}")')
        a.wait_for_function("document.getElementById('secretText').textContent.startsWith('Nope')", timeout=6000)
        assert a.locator('#secretCard').is_visible() and '#' not in a.url
        print('PASS the wrong secret is refused by the room')
        a.click('#choices button:text-is("Meatball")')
        a.wait_for_selector('#shareCard:not([hidden])', timeout=6000)
        link = a.input_value('#link')
        assert '#' in link and len(link.split('#')[1]) == 12, link
        a.wait_for_function("document.getElementById('ping').textContent === '' && !document.getElementById('shareCard').hidden")
        a.screenshot(path=str(SHOTS / '2-waiting.png'))
        print('PASS start a match: link made, waiting for a friend')

        cb, b = phone(browser, errors)
        b.goto(link)
        for page in (a, b):
            wait_present(page, 2)
            assert page.locator('#shareCard').is_hidden() and page.locator('#titleCard').is_hidden()
        a.wait_for_timeout(400)
        a.screenshot(path=str(SHOTS / '3-friend-here.png'))
        print('PASS the friend opens the link and both phones see each other')

        # A drags to the middle; B sees A's dot arrive there (drawn from the relayed position).
        drag(a, 0.28, 0.5, 0.5, 0.3)
        b.wait_for_timeout(500)
        b.screenshot(path=str(SHOTS / '4-friend-moved.png'))

        # B drags into A's dot: both phones burst.
        drag(b, 0.72, 0.5, 0.5, 0.3, steps=16)
        for page in (a, b):
            page.wait_for_function("document.getElementById('banner').textContent.startsWith('WE DID IT')", timeout=4000)
        b.wait_for_timeout(150)
        b.screenshot(path=str(SHOTS / '5-we-did-it.png'))
        print('PASS dots touch: WE DID IT on both phones')

        a.wait_for_function("/ms apart/.test(document.getElementById('ping').textContent)", timeout=6000)
        print('PASS the phones show how far apart they are:', a.text_content('#ping'))

        # A link to a room nobody opened with the secret doesn't open.
        cn, n = phone(browser, errors)
        n.goto(URL + '#neveropenedroom')
        n.wait_for_selector('#msgCard:not([hidden])', timeout=6000)
        assert "isn't open" in n.text_content('#msgTitle')
        cn.close()
        print("PASS a made-up link isn't a match")

        # Invite opens the link again without leaving the game; Back closes it.
        assert a.locator('#inviteBtn').is_visible()
        a.click('#inviteBtn')
        a.wait_for_selector('#shareCard:not([hidden])')
        assert a.locator('#backBtn').is_visible() and a.locator('#waitText').is_hidden()
        a.click('#backBtn')
        assert a.locator('#shareCard').is_hidden()
        print('PASS Invite shows the link mid-game, Back returns')

        # A third and fourth phone join; everyone sees four.
        cc, c = phone(browser, errors)
        c.goto(link)
        cd, d = phone(browser, errors)
        d.goto(link)
        for page in (a, b, c, d):
            wait_present(page, 4)
        assert a.locator('#inviteBtn').is_hidden()
        c.wait_for_timeout(400)
        c.screenshot(path=str(SHOTS / '6-four-players.png'))
        print('PASS four phones in one match, each sees all four; Invite hides when full')

        # A fifth phone is turned away.
        ce, e = phone(browser, errors)
        e.goto(link)
        e.wait_for_selector('#msgCard:not([hidden])', timeout=6000)
        assert 'full' in e.text_content('#msgTitle')
        ce.close()
        print('PASS a fifth phone is told the match is full')

        # Everyone piles into the middle: EVERYONE! on every phone.
        drag(c, 0.5, 0.28, 0.5, 0.5)
        drag(d, 0.5, 0.72, 0.5, 0.5)
        drag(a, 0.5, 0.3, 0.5, 0.5)
        drag(b, 0.5, 0.3, 0.5, 0.5)
        for page in (a, b, c, d):
            page.wait_for_function("document.getElementById('banner').textContent.startsWith('EVERYONE')", timeout=5000)
        d.wait_for_timeout(150)
        d.screenshot(path=str(SHOTS / '7-everyone.png'))
        print('PASS all four pile up: EVERYONE! on every phone')

        # C leaves; the others are told. C comes back with the same link.
        cc.close()
        for page in (a, b, d):
            wait_present(page, 3)
        assert 'left' in a.text_content('#banner')
        cc, c = phone(browser, errors)
        c.goto(link)
        wait_present(a, 4)
        print('PASS leaving is shown, and the same link brings them back')

        # Landscape and desktop layouts keep the play square on screen.
        for size in ({'width': 844, 'height': 390}, {'width': 1280, 'height': 800}):
            a.set_viewport_size(size)
            a.wait_for_timeout(200)
            x, y = dot_xy(a, 1, 1)
            assert 0 < x <= size['width'] and 0 < y <= size['height'], (size, x, y)
        a.screenshot(path=str(SHOTS / '8-desktop.png'))
        print('PASS landscape and desktop')

        assert not errors, errors
        print('PASS no page errors')
        browser.close()


if __name__ == '__main__':
    main()
