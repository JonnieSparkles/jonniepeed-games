"""Unruggabull: RugCo Alley Remastered, browser checks.

Serve the site first (README, Browser checks):

    python3 -m http.server 8000 --bind 127.0.0.1 --directory site

Then: CHROMIUM=/usr/bin/chromium python3 tests/unruggabull-remastered/test.py

SITE_URL overrides the site address. SCREENSHOTS sets where screenshots go (default /tmp/unruggabull-remastered).
The game's own globals (gameState, player, gameNow and the rest) are read straight from the page.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

SITE = os.environ.get('SITE_URL', 'http://127.0.0.1:8000').rstrip('/')
URL = SITE + '/unruggabull-remastered/'
SHOTS = Path(os.environ.get('SCREENSHOTS', '/tmp/unruggabull-remastered'))
SHOTS.mkdir(parents=True, exist_ok=True)
PHONE = {'width': 780, 'height': 360}   # a Galaxy S25 held sideways, in CSS pixels


def launch(p):
    exe = os.environ.get('CHROMIUM')
    return p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()


def watch(page):
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    # the scores Worker isn't running here, so its requests fail; the game carries on without it
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    return errors


def js(page, expr):
    return page.evaluate(expr)


def wait_state(page, state, timeout=8000):
    page.wait_for_function(f"gameState === {state!r}", timeout=timeout)


class Touch:
    """Raw multi-touch through the DevTools protocol, so a thumb can be held down and slid."""
    def __init__(self, context, page):
        self.cdp = context.new_cdp_session(page)
        self.points = {}

    def _send(self, kind):
        pts = [{'x': x, 'y': y, 'id': i} for i, (x, y) in self.points.items()]
        self.cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': pts})

    def down(self, i, x, y):
        self.points[i] = (x, y)
        self._send('touchStart')

    def move(self, i, x, y):
        self.points[i] = (x, y)
        self._send('touchMove')

    def up(self, i):
        # lifting one finger is a move with the rest still down; the last one ends the touch
        self.points.pop(i, None)
        self._send('touchMove' if self.points else 'touchEnd')


def count_shots(page):
    """Counts the bull's shots from here on (energy alone can't: at full charge a shot is refilled at once, as in 2025)."""
    js(page, 'window.shots = 0; if (!window.realSpawn) { window.realSpawn = spawnPlayerBullet; spawnPlayerBullet = p => { window.shots++; return window.realSpawn(p); }; } 0;')


def pad(page):
    """The pad's centre and arm length, as phone.js lays them out."""
    w, h = page.viewport_size['width'], page.viewport_size['height']
    u = min(h, w * 0.6)
    return 0.23 * u, h - 0.3 * u, 0.19 * u


def start_on_phone(page):
    page.goto(URL, wait_until='load')
    page.wait_for_timeout(500)
    page.screenshot(path=str(SHOTS / 'phone-title.png'))
    page.locator('#menu [data-act=play]').tap()
    wait_state(page, 'controls', 6000)
    page.screenshot(path=str(SHOTS / 'phone-controls.png'))
    page.touchscreen.tap(PHONE['width'] / 2, PHONE['height'] / 2)
    wait_state(page, 'playing')


def phone_checks(p):
    browser = launch(p)
    ctx = browser.new_context(viewport=PHONE, device_scale_factor=2, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    errors = watch(page)
    start_on_phone(page)
    touch = Touch(ctx, page)

    # the alley fills the height, centred, with bars at the sides
    r = page.locator('#gameCanvas').bounding_box()
    assert abs(r['height'] - PHONE['height']) < 1 and abs(r['x'] - (PHONE['width'] - r['width']) / 2) < 1, r

    # the game clock runs at about real time
    c0 = js(page, 'gameNow()'); page.wait_for_timeout(1000); c1 = js(page, 'gameNow()')
    assert 800 < c1 - c0 < 1200, ('clock', c1 - c0)

    # right on the pad walks right
    cx, cy, cr = pad(page)
    x0 = js(page, 'player.x')
    touch.down(0, cx + cr * 0.8, cy); page.wait_for_timeout(500)
    assert js(page, 'player.x') > x0 + 40, 'right on the pad walks right'
    # sliding to up-right jumps once while still walking
    touch.move(0, cx + cr * 0.6, cy - cr * 0.6); page.wait_for_timeout(150)
    assert not js(page, 'player.grounded'), 'up-right jumps'
    page.screenshot(path=str(SHOTS / 'phone-jump.png'))
    page.wait_for_timeout(1400)
    assert js(page, 'player.grounded'), 'one jump per press: holding up does not keep jumping'
    touch.up(0)

    # down crouches
    touch.down(0, cx, cy + cr * 0.8); page.wait_for_timeout(200)
    assert js(page, 'player.crouching'), 'down crouches'
    touch.up(0); page.wait_for_timeout(100)

    # a tap anywhere on the right half fires one shot; holding fires once
    count_shots(page)
    page.touchscreen.tap(PHONE['width'] * 0.6, PHONE['height'] * 0.4); page.wait_for_timeout(80)
    assert js(page, 'window.shots') == 1, 'a tap fires once'
    touch.down(1, PHONE['width'] * 0.8, PHONE['height'] * 0.7); page.wait_for_timeout(400)
    assert js(page, 'window.shots') == 2, 'holding fire shoots once'
    touch.up(1)

    # pause stops the clock; resume starts it
    page.click('#pause-btn')
    assert js(page, 'gamePaused')
    c0 = js(page, 'gameNow()'); page.wait_for_timeout(400)
    assert js(page, 'gameNow()') == c0, 'paused: the clock stops'
    page.screenshot(path=str(SHOTS / 'phone-pause.png'))
    page.click('#resume-btn'); page.wait_for_timeout(200)
    assert not js(page, 'gamePaused') and js(page, 'gameNow()') > c0

    # held upright: the portrait screen, and the game waits
    page.set_viewport_size({'width': 360, 'height': 780}); page.wait_for_timeout(300)
    assert js(page, "!document.getElementById('rotate').hidden") and js(page, 'gamePaused')
    page.screenshot(path=str(SHOTS / 'phone-portrait.png'))
    page.set_viewport_size(PHONE); page.wait_for_timeout(300)
    assert js(page, "document.getElementById('rotate').hidden")
    page.click('#resume-btn')

    # rugged: how far he got, and Retry starts a fresh run on the controls screen
    js(page, 'player.invulnerable = false; player.health = 1; handlePlayerHit({})')
    wait_state(page, 'gameover', 6000)
    assert 'UNRUGGED' in js(page, "document.getElementById('rugged-line').textContent")
    page.screenshot(path=str(SHOTS / 'phone-rugged.png'))
    page.locator('#retry2-btn').tap()
    wait_state(page, 'controls')
    assert js(page, "document.getElementById('end').hidden")

    assert not errors, errors
    browser.close()
    print('phone: ok')


def desktop_checks(p):
    browser = launch(p)
    ctx = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = ctx.new_page()
    errors = watch(page)
    page.goto(URL, wait_until='load')
    page.wait_for_timeout(400)
    # the menu by keyboard: down and up move the blaster, Enter picks
    page.keyboard.press('ArrowDown'); page.keyboard.press('ArrowUp')
    assert js(page, "document.querySelector('#menu .on').dataset.act") == 'play'
    page.keyboard.press('Enter')
    wait_state(page, 'controls', 6000)
    page.keyboard.press('x')
    wait_state(page, 'playing')
    assert not js(page, 'usingTouch()')
    x0 = js(page, 'player.x')
    page.keyboard.down('d'); page.wait_for_timeout(400); page.keyboard.up('d')
    assert js(page, 'player.x') > x0 + 40
    page.keyboard.down(' '); page.wait_for_timeout(120)
    assert not js(page, 'player.grounded')
    page.keyboard.up(' ')
    count_shots(page)
    page.keyboard.down('f'); page.wait_for_timeout(60); page.keyboard.up('f')
    assert js(page, 'window.shots') == 1
    page.keyboard.press('Escape'); page.wait_for_timeout(100)
    assert js(page, 'gamePaused')
    page.keyboard.press('Escape'); page.wait_for_timeout(100)
    assert not js(page, 'gamePaused')
    page.screenshot(path=str(SHOTS / 'desktop.png'))
    assert not errors, errors
    browser.close()
    print('desktop: ok')


def title_checks(p):
    """The title's cards: the board (offline here: this device's clears), the gallery and the credits."""
    browser = launch(p)
    ctx = browser.new_context(viewport=PHONE, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    errors = watch(page)
    page.route('http://localhost:8787/**', lambda route: route.abort())
    page.add_init_script("""localStorage.setItem('unruggabull-remastered-clears-1', JSON.stringify([
      { name: 'ACE', ms: 112800, health: 100, unrugged: 81, input: 'touch' }, { name: 'BUL', ms: 117100, health: 95, unrugged: 78, input: 'keys' }]));""")
    page.goto(URL, wait_until='load')
    page.wait_for_timeout(400)
    assert 'ACE 1:52.8' in js(page, "document.getElementById('best').textContent")
    page.locator('#menu [data-act=board]').tap()
    page.wait_for_selector('#board-list .lb-table')
    assert js(page, "document.querySelectorAll('#board-list tbody tr').length") == 2
    page.screenshot(path=str(SHOTS / 'title-board.png'))
    page.locator('#close-board').tap()
    page.locator('#menu [data-act=gallery]').tap()
    first = js(page, "document.getElementById('gallery-img').src")
    page.locator('#gallery-next').tap()
    assert js(page, "document.getElementById('gallery-img').src") != first
    page.locator('#close-gallery').tap()
    page.locator('#menu [data-act=credits]').tap()
    assert js(page, "!document.getElementById('credits').hidden")
    assert js(page, "document.querySelector('#menu a').href").startswith('https://unruggabull.ar.io')
    assert not errors, errors
    browser.close()
    print('title: ok')


def boss_checks(p):
    """The whole fight on a fake clock: the 32-second intro, the battle, the Rugfather's defeat and the card."""
    browser = launch(p)
    ctx = browser.new_context(viewport=PHONE, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    errors = watch(page)
    page.route('http://localhost:8787/**', lambda route: route.abort())
    page.clock.install()
    start_on_phone(page)
    js(page, 'setDifficultyLevel(6)')
    page.clock.run_for(40000)
    assert js(page, 'getBossBattleStarted()'), 'the intro hands over to the fight'
    page.screenshot(path=str(SHOTS / 'boss-fight.png'))
    js(page, '__bossState.hp = 1')
    for _ in range(20):
        if js(page, '__bossState.dying'):
            break
        page.touchscreen.tap(PHONE['width'] * 0.8, PHONE['height'] * 0.5)
        page.clock.run_for(300)
    assert js(page, '__bossState.dying'), 'the Rugfather goes down'
    page.clock.run_for(15000)
    assert js(page, 'gameState') == 'congrats'
    page.screenshot(path=str(SHOTS / 'congrats.png'))
    # the end card: the run's numbers, then initials (offline here, so for this device's board)
    page.clock.run_for(4000)
    page.wait_for_selector('.lb-entry')
    assert js(page, "document.querySelectorAll('#end-stats .stat').length") == 3
    page.screenshot(path=str(SHOTS / 'end-initials.png'))
    page.locator('.lb-ok').tap()
    page.wait_for_selector('#end-board .lb-table')
    assert js(page, "document.querySelector('#end-board .lb-you') !== null")
    page.screenshot(path=str(SHOTS / 'end-board.png'))
    assert not errors, errors
    browser.close()
    print('boss: ok')


if __name__ == '__main__':
    with sync_playwright() as p:
        phone_checks(p)
        desktop_checks(p)
        title_checks(p)
        boss_checks(p)
    print('all ok; screenshots in', SHOTS)
