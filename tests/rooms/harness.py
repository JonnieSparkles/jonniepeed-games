"""Helpers for browser tests of games played together over the internet (site/assets/rooms.js).

A test opens a few browsers, each in its own context (its own session, like separate devices), and points them
at the same match link. Each is a phone by default; `phones.new(desktop=True)` is a computer with a mouse and a
big window, so a test can mix the two the way real players do. Start both servers first, then import this from a test:

    python3 -m http.server 8000 --bind 127.0.0.1 --directory site
    (cd rooms && wrangler dev --local --port 8788 --var GHOST_MS:6000 --var LEAVE_GRACE_MS:500)

    import sys; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'rooms'))
    from harness import Phones, wait

    with Phones() as phones:
        a = phones.new()
        a.goto(phones.url('my-game/'))
        ...

Pages on localhost or 127.0.0.1 use the local rooms Worker on port 8788. SITE_URL overrides the site address.
"""
import json
import os
import urllib.request
from playwright.sync_api import sync_playwright

SITE = os.environ.get('SITE_URL', 'http://127.0.0.1:8000').rstrip('/')
ROOMS_HTTP = 'http://localhost:8788'
PHONE = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
DESKTOP = dict(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, has_touch=False, is_mobile=False)


def servers_up():
    """Fails early, with a hint, if the site or the local rooms Worker isn't running."""
    for url, hint in ((SITE + '/', 'python3 -m http.server 8000 --bind 127.0.0.1 --directory site'),
                      (ROOMS_HTTP + '/', '(cd rooms && wrangler dev --local --port 8788 --var GHOST_MS:6000 --var LEAVE_GRACE_MS:500)')):
        try:
            urllib.request.urlopen(url, timeout=3).read()
        except Exception:
            raise SystemExit(f'{url} is not answering. Start it with: {hint}')
    info = json.load(urllib.request.urlopen(ROOMS_HTTP + '/', timeout=3))
    return info


def wait(page, js, timeout=8000):
    """Waits until a JavaScript expression is true on the page."""
    page.wait_for_function(js, timeout=timeout)


class Phones:
    """A browser with one context per phone. Page errors on any phone are collected in .errors."""

    def __init__(self, **phone):
        self.options = dict(PHONE, **phone)
        self.errors = []
        self.contexts = []

    def __enter__(self):
        servers_up()
        self.pw = sync_playwright().start()
        exe = os.environ.get('CHROMIUM')
        self.browser = self.pw.chromium.launch(**({'executable_path': exe} if exe else {}))
        return self

    def __exit__(self, *exc):
        self.browser.close()
        self.pw.stop()

    def url(self, path=''):
        return SITE + '/' + path.lstrip('/')

    def new(self, init_script=None, desktop=False, **options):
        """A new player: a fresh context (own session storage), one page. A phone unless desktop=True."""
        context = self.browser.new_context(**dict(DESKTOP if desktop else self.options, **options))
        self.contexts.append(context)
        page = context.new_page()
        if init_script:
            page.add_init_script(init_script)
        page.on('pageerror', lambda e: self.errors.append(str(e)))
        return page

    def check_no_errors(self):
        assert not self.errors, self.errors
