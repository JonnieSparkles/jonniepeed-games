"""Online high scores, with the scores API stubbed in the browser (no Worker needed).
Run python3 tests/stick-army/board.py with site/ on port 8000; optional SCREENSHOTS directory.

Checks: a lost run asks, takes initials and draws the board with the player's row; the victory card saves the campaign
score with won=1; the endless game over after a win shows the board without asking again; Skip; a run that can't
reach the scores keeps its buttons; seeded runs never ask for a token; the title's High scores card and the facing
page's top five."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get('SCREENSHOTS', '/tmp/stick-army-screenshots'))
OUT.mkdir(parents=True, exist_ok=True)
SITE = os.environ.get('SITE_URL', 'http://127.0.0.1:8000')
ROWS = [{'rank': i + 1, 'name': n, 'score': s, 'input': 'touch' if i % 2 else 'keys', 'meta': {'time_ms': 900000, 'wave': w, 'won': int(w == 20)}}
        for i, (n, s, w) in enumerate([('JON', 446661, 20), ('JON', 435479, 20), ('MOM', 212040, 16), ('ACE', 188455, 14), ('DOT', 97310, 11),
                                        ('PIP', 80000, 10), ('NIB', 61000, 9), ('INK', 40000, 8), ('BLT', 30000, 7), ('ZIG', 20000, 6), ('TIP', 9000, 4)])]


def check(cond, what):
    if not cond:
        raise AssertionError(what)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM'))
    errors = []
    for width, height in [(390, 844), (1280, 800)]:
        page = browser.new_page(viewport={'width': width, 'height': height}, has_touch=width < 500)
        page.on('pageerror', lambda e: errors.append(str(e)))
        calls = {'start': 0, 'submit': [], 'online': True}

        def api(route):
            url, req = route.request.url, route.request
            if not calls['online']:
                return route.abort()
            if '/v2/start' in url:
                calls['start'] += 1
                return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'token': 'run.1.sig'}))
            if '/v2/top' in url:
                body = {'ok': True, 'game': 'stick-army', 'board': 1, 'scores': ROWS}
                if 'score=' in url:
                    body.update({'placement': 3, 'position': 3, 'total': 40})
                return route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
            if '/v2/submit' in url:
                data = json.loads(req.post_data); calls['submit'].append(data)
                rows = ROWS[:2] + [{'rank': 3, 'name': data['name'], 'score': data['score'], 'input': data['input'], 'meta': data['meta']}] + [dict(r, rank=r['rank'] + 1) for r in ROWS[2:9]]
                return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'id': 1, 'rank': 3, 'position': 3, 'total': 41, 'scores': rows}))
            return route.continue_()
        page.route('http://localhost:8787/**', api)
        source = (ROOT / 'site/stick-army/game.js').read_text().replace('  start();', '  window.armyTest = function(code) { return eval(code); };\n  start();')
        page.route('**/stick-army/game.js*', lambda route: route.fulfill(body=source, content_type='application/javascript'))
        page.goto(SITE + '/stick-army/')
        T = lambda code: page.evaluate('(c) => armyTest(c)', code)

        # The title's high scores: the card over the title, and the facing page's top five on a wide screen.
        page.click('#titleScoresBtn'); page.wait_for_selector('#scoresBox .lb-table')
        check(page.locator('#scoresBox tbody tr').count() == 10, 'top 10 on the title card')
        page.screenshot(path=str(OUT / f'board-title-{width}.png'))
        page.keyboard.press('Escape'); check(page.locator('#scoresScreen').is_hidden(), 'Escape closes the high scores')
        if width > 1000:
            page.wait_for_function("document.querySelectorAll('#facingRows li .sc').length === 5")

        # A lost run: checking, then asking, then the picker, then the board with the new row.
        page.click('#startBtn'); page.wait_for_timeout(300)
        check(calls['start'] == 1, 'a real run asks for a token')
        T("S.score = 123456; S.wave = 12; S.played = 600; die(); S.dieT = 0; update(1/60);")
        check(page.locator('#overScreen .card').evaluate('(c) => c.classList.contains("lb-checking")'), 'checking the scores first')
        page.wait_for_selector('#overScreen .lb-asking .lb-note:has-text("New high score")')
        check(page.locator('#againBtn').is_hidden(), 'Play again waits while asking')
        page.click('#overScreen .lb-ask .btn')
        page.wait_for_selector('#overScreen .lb-entry')
        page.keyboard.type('ZAP'); page.screenshot(path=str(OUT / f'board-picker-{width}.png'))
        page.click('#overScreen .lb-ok')
        page.wait_for_selector('#overScreen .lb-you')
        sent = calls['submit'][-1]
        check(sent['score'] == 123456 and sent['meta'] == {'time_ms': 600000, 'wave': 12, 'won': 0} and sent['name'] == 'ZAP', sent)
        check(page.locator('#againBtn').is_visible(), 'Play again is back')
        page.screenshot(path=str(OUT / f'board-over-{width}.png'))

        # A win: the victory card saves the campaign score with won=1; Skip works; endless game over just shows the board.
        page.click('#againBtn'); page.wait_for_timeout(200)
        T("S.score = 400000; S.wave = DREAD.WAVE; S.played = 900; S.finalWon = true; showWin();")
        page.wait_for_selector('#winScreen .lb-asking')
        page.click('#winScreen .lb-ask .btn'); page.wait_for_selector('#winScreen .lb-entry')
        page.click('#winScreen .lb-skip'); page.wait_for_selector('#winScreen .lb-table')
        check(len(calls['submit']) == 1, 'Skip saves nothing')
        page.click('#keepBtn'); page.wait_for_timeout(200)
        check(page.locator('#winScreen .lb').count() == 1 and page.locator('#winScreen .lb').is_hidden(), 'keep going clears the board')
        T("shopScreen.hidden = true; S.mode = 'play'; S.wave = 23; die(); S.dieT = 0; update(1/60);")
        page.wait_for_selector('#overScreen .lb-table')
        check(not page.locator('#overScreen .card').evaluate('(c) => c.classList.contains("lb-asking") || c.classList.contains("lb-checking")'), 'no second ask after a win')
        check(calls['start'] == 2, 'one token per run')

        # Offline: the buttons stay, nothing breaks.
        calls['online'] = False
        page.click('#againBtn'); page.wait_for_timeout(200)
        T("die(); S.dieT = 0; update(1/60);")
        page.wait_for_timeout(900)
        check(page.locator('#againBtn').is_visible(), 'offline keeps Play again')
        calls['online'] = True
        page.close()

    # A seeded run never asks for a token.
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    starts = []
    page.route('http://localhost:8787/**', lambda route: (starts.append(route.request.url) if '/v2/start' in route.request.url else None, route.abort()))
    page.goto(SITE + '/stick-army/#seed=42'); page.click('#startBtn'); page.wait_for_timeout(300)
    check(not starts, 'seeded runs get no token')
    page.close()
    browser.close()
    check(not errors, errors)
print('PASS board: ask, save, skip, win, endless, offline, seeded, title')
