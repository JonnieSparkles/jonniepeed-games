"""Browser checks for play stats in each game: what a run reports at its start, at game over, when the page is
hidden mid-run, and when the player leaves or restarts a run. Nothing reaches a Worker: beacons are recorded in
the page, and the leaderboard's run token is answered here. Serve site/ on port 8000 first (see README), then:

    CHROMIUM=/usr/bin/chromium python3 stats/test/games.py

Requires Python Playwright. SITE_URL overrides the local site address.
"""
import os
import re
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SITE = os.environ.get('SITE_URL', 'http://127.0.0.1:8000').rstrip('/')
UUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
TOKEN_ID = str(uuid.uuid4())

# Runs before any page script: un-hide the automated browser (stats.js stays quiet under automation),
# record beacons instead of sending them, and let tests pretend the page was hidden.
RECORD = """
Object.defineProperty(Navigator.prototype, 'webdriver', { configurable: true, get: () => false });
window.__beacons = [];
Object.defineProperty(Navigator.prototype, 'sendBeacon', { configurable: true, value: function (url, data) {
  window.__beacons.push({ path: new URL(url).pathname, origin: new URL(url).origin, body: JSON.parse(data) }); return true; } });
window.__hide = function () {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
  delete document.visibilityState; delete document.hidden;
  document.dispatchEvent(new Event('visibilitychange'));
};
"""


def beacons(page, since=0):
    return page.evaluate('window.__beacons')[since:]


def check_start(b, game, board):
    assert b['path'] == '/v1/start', b
    assert b['origin'] == 'http://localhost:8789', b
    body = b['body']
    assert body['game'] == game and body.get('board') == board, body
    assert UUID.match(body['run']) and UUID.match(body['visit']), body
    assert body['device'] in ('phone', 'tablet', 'desktop') and body['orientation'] in ('portrait', 'landscape'), body
    assert body['host'] == '127.0.0.1', body
    return body


def check_end(b, start, outcome, keys):
    assert b['path'] == '/v1/end', b
    body = b['body']
    assert body['run'] == start['run'] and body['visit'] == start['visit'], body
    assert body['outcome'] == outcome, body
    assert isinstance(body['time_ms'], int) and body['time_ms'] >= 0, body
    assert set(keys) <= set(body.get('stats', {})), (keys, body)
    return body


def new_page(browser, record=True, **options):
    context = browser.new_context(**options)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    if record:
        page.add_init_script(RECORD)
    # The leaderboard's run token, answered here so a saved run can be matched without a Worker.
    page.route('http://localhost:8787/v2/start', lambda route: route.fulfill(
        status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'},
        body='{"ok":true,"token":"%s.1760000000000.%s"}' % (TOKEN_ID, 'A' * 43)))
    page.route('http://localhost:8787/v2/top*', lambda route: route.fulfill(
        status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'},
        body='{"ok":true,"game":"x","board":1,"scores":[]}'))
    return context, page, errors


def thimbleful(browser):
    context, page, errors = new_page(browser, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    page.goto(SITE + '/thimbleful/')
    page.click('#go')
    page.wait_for_timeout(300)
    if page.is_visible('#skip'):
        page.click('#skip')
    start = check_start(beacons(page)[0], 'thimbleful', page.evaluate('BOARD'))
    page.wait_for_timeout(600)  # the token arrives
    page.evaluate('() => { score = 7; spills = 5; end(); }')
    end = check_end(beacons(page)[1], start, 'over', ['golds', 'spills', 'earned', 'storm'])
    assert end['score'] == 7 and end['stats']['spills'] == 5, end
    assert end['score_run'] == TOKEN_ID, end
    # A second run, left mid-way: hiding the page sends a provisional quit with the progress so far.
    page.click('#go')
    second = check_start(beacons(page)[2], 'thimbleful', page.evaluate('BOARD'))
    page.evaluate('() => { score = 3; }')
    page.evaluate('__hide()')
    check_end(beacons(page)[3], second, 'quit', ['spills'])
    assert beacons(page)[3]['body']['score'] == 3
    assert len(beacons(page)) == 4, beacons(page)  # one report per hide, not one per event
    assert not errors, errors
    context.close()
    print('PASS thimbleful: start, game over with token run ID, hidden mid-run')


def crack(browser):
    context, page, errors = new_page(browser, viewport={'width': 1280, 'height': 800})
    page.goto(SITE + '/dont-step-on-a-crack/')
    page.click('#start')
    start = check_start(beacons(page)[0], 'dont-step-on-a-crack', page.evaluate('BOARD'))
    page.wait_for_timeout(600)
    page.evaluate('() => { hp = 0; gameOver(performance.now() / 1000); }')
    end = check_end(beacons(page)[1], start, 'over', ['steps', 'streak', 'street', 'giants'])
    assert end['stats']['street'] == 1 and end['score_run'] == TOKEN_ID, end
    # Restart from pause: the open walk reports as quit, then a new one starts.
    page.evaluate('startGame()')
    walk = check_start(beacons(page)[2], 'dont-step-on-a-crack', page.evaluate('BOARD'))
    page.evaluate('pauseGame()')
    page.click('#restart')
    check_end(beacons(page)[3], walk, 'quit', ['steps'])
    third = check_start(beacons(page)[4], 'dont-step-on-a-crack', page.evaluate('BOARD'))
    # Back to the title from pause: quit again.
    page.evaluate('pauseGame()')
    page.click('#toTitle')
    check_end(beacons(page)[5], third, 'quit', ['steps'])
    assert len(beacons(page)) == 6, beacons(page)
    assert not errors, errors
    context.close()
    print('PASS dont-step-on-a-crack: start, game over, restart and title from pause')


def stick_army(browser):
    context, page, errors = new_page(browser, viewport={'width': 1000, 'height': 900})
    # A test-only bridge into the game's closure, injected into the response like tests/stick-army/test.py.
    source = (ROOT / 'site/stick-army/game.js').read_text()
    source = source.replace('  start();', "  window.armyTest = function (code) { return eval(code); };\n  start();")
    page.route('**/stick-army/game.js*', lambda route: route.fulfill(body=source, content_type='application/javascript'))
    page.goto(SITE + '/stick-army/')
    page.click('#startBtn')
    start = check_start(beacons(page)[0], 'stick-army', None)
    page.evaluate("armyTest(\"S.score = 420; S.wave = 3; S.stats.kills = 9; S.lastHit = 'bomb'; S.mode = 'dying'; showOver();\")")
    end = check_end(beacons(page)[1], start, 'over', ['wave', 'kills', 'captured', 'crew', 'fallen', 'tags', 'cause'])
    assert end['score'] == 420 and end['stats']['wave'] == 3 and end['stats']['cause'] == 'bomb', end
    assert 'score_run' not in end, end
    # A win (from the campaign) counts as won, even when the page is left on the victory card.
    page.click('#againBtn')
    second = check_start(beacons(page)[2], 'stick-army', None)
    page.evaluate("armyTest('S.won = true; S.wonAt = 15; S.wave = 15;')")
    page.evaluate('__hide()')
    won = check_end(beacons(page)[3], second, 'won', ['wave', 'won_at'])
    assert 'cause' not in won['stats'], won
    # Restart from pause: the run reports as won (it was), then a new run starts.
    page.evaluate("armyTest(\"S.mode = 'play'\")")
    page.click('#pauseBtn')
    page.click('#restartBtn')
    check_end(beacons(page)[4], second, 'won', ['wave'])
    check_start(beacons(page)[5], 'stick-army', None)
    assert not errors, errors
    context.close()
    print('PASS stick-army: start, game over with cause, won on leaving, restart from pause')


def automated_is_quiet(browser):
    # Without the override, an automated browser (the harnesses, the balance bots) sends nothing at all.
    context, page, errors = new_page(browser, record=False)
    sent = []
    page.on('request', lambda r: sent.append(r.url) if r.url.startswith('http://localhost:8789') else None)
    page.goto(SITE + '/thimbleful/')
    page.click('#go')
    page.wait_for_timeout(300)
    page.evaluate('() => { spills = 5; state = "play"; end(); }')
    page.wait_for_timeout(300)
    assert sent == [], sent
    assert page.evaluate('typeof PlayStats.start') == 'function'
    assert not errors, errors
    context.close()
    print('PASS automated browsers send nothing')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM'))
    thimbleful(browser)
    crack(browser)
    stick_army(browser)
    automated_is_quiet(browser)
    browser.close()
