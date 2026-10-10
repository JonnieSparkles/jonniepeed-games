"""Co-op over a real room (docs/games/stick-army/coop.md): a computer hosts, a phone joins from the link.
Needs the site and a local rooms Worker (docs/guides/05-rooms.md, Testing):

    python3 -m http.server 8000 --bind 127.0.0.1 --directory site
    (cd rooms && wrangler dev --local --port 8788 --var GHOST_MS:6000 --var LEAVE_GRACE_MS:500)
    python3 tests/stick-army/coop_room.py

Checks: the secret and the link card, the guest's waiting card, Start, the guest drawing the host's game, the guest's
trigger and calls and pause reaching the host, the guest dropping out and coming back (and a reload), the host
dropping out and coming back, and no page errors.
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'rooms'))
from harness import Phones, wait  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SOURCE = (ROOT / 'site/stick-army/game.js').read_text().replace(
    '  start();', "  window.armyTest = function (code) { return eval(code); };\n  start();")


def bridge(page):
    page.route('**/stick-army/game.js*', lambda route: route.fulfill(body=SOURCE, content_type='application/javascript'))


def js(page, code):
    return page.evaluate('(c) => armyTest(c)', code)


def check(ok, why):
    if not ok:
        raise AssertionError(why)
    print('ok', why)


def card(page):
    return page.evaluate("() => { const o = document.getElementById('coopScreen'); return o && !o.hidden ? o.querySelector('h2').textContent : null; }")


with Phones() as phones:
    host = phones.new(desktop=True)
    bridge(host)
    host.goto(phones.url('stick-army/'))
    host.click('#coopBtn')
    check(card(host) == 'Play with a friend', 'Play with a friend asks for the secret')
    host.click('#coopScreen button:text-is("Meatball")')
    wait(host, "() => document.getElementById('coopStart')")
    check(card(host) == 'Send the link' and host.is_disabled('#coopStart'), 'the link card waits for a friend, Start greyed')
    link = host.text_content('.coop-link')
    check('#' in link, 'the link carries the match: ' + link)

    guest = phones.new()
    bridge(guest)
    guest.goto(link)
    wait(guest, "() => { const o = document.getElementById('coopScreen'); return o && !o.hidden && /Waiting for your/.test(o.textContent); }")
    check(not guest.is_hidden('#titleScreen'), "the guest waits on the title's demo")
    wait(host, "() => !document.getElementById('coopStart').disabled")
    check(True, 'the host sees the friend arrive; Start lights up')

    host.click('#coopStart')
    wait(host, "() => armyTest('S.mode') === 'play' && armyTest('S.turrets.length') === 2")
    wait(guest, "() => document.getElementById('titleScreen').hidden && armyTest('COOP.guest && S.mode === \"play\" && S.turrets.length === 2')", 10000)
    check(True, "the guest draws the host's game, two barrels")
    check(js(host, 'LBOARD && S.mode') == 'play' and js(host, 'RUN.players') == 2, 'the host runs a two-player run')

    # The guest's trigger: hold the mouse on the page and the host fires the second barrel.
    box = guest.locator('#game').bounding_box()
    guest.mouse.move(box['x'] + box['width'] * 0.8, box['y'] + box['height'] * 0.35)
    guest.mouse.down()
    wait(host, "() => armyTest('S.turrets[1].firing && S.bullets.some(function (b) { return b.by === 1; })')")
    check(js(host, 'S.turrets[1].aim') > -1.4, "the guest's aim and trigger reach the host (aim %.2f)" % js(host, 'S.turrets[1].aim'))
    guest.mouse.up()
    wait(host, "() => !armyTest('S.turrets[1].firing')")
    check(True, 'and letting go stops it')

    # A call from the guest: the host makes it.
    js(host, 'S.calls.bomber = 1; "ok"')
    wait(guest, "() => !document.getElementById('strikeBtn').hidden")
    guest.click('#strikeBtn')
    wait(host, "() => armyTest('!!S.strike')")
    check(True, "the guest's air strike button calls the host's air strike")

    # Pause from the guest pauses both; Resume from the guest resumes both.
    guest.keyboard.press('p')
    wait(host, "() => armyTest('S.mode') === 'paused'")
    wait(guest, "() => !document.getElementById('pauseScreen').hidden")
    check(guest.is_hidden('#restartBtn'), 'the guest pauses both; its pause card has no Restart')
    guest.click('#resumeBtn')
    wait(host, "() => armyTest('S.mode') === 'play'")
    wait(guest, "() => document.getElementById('pauseScreen').hidden")
    check(True, 'and resumes both')

    # The guest reloads: it keeps its seat and draws again from a fresh field.
    guest.reload()
    wait(guest, "() => armyTest('COOP.guest && S.mode === \"play\"')", 10000)
    check(abs(js(guest, 'S.wave') - js(host, 'S.wave')) == 0, 'a reloaded guest is back in the game')

    # The guest drops out: its barrel goes quiet and play goes on; it comes back.
    guest.context.set_offline(True)
    wait(host, "() => !document.getElementById('coopStatus').hidden && /dropped out/.test(document.getElementById('coopStatus').textContent)", 15000)
    check(js(host, 'S.mode') == 'play', 'the guest drops out: the host is told and play goes on')
    guest.context.set_offline(False)
    wait(host, "() => !/dropped out/.test(document.getElementById('coopStatus').textContent)", 20000)
    wait(guest, "() => armyTest('COOP.guest && S.mode === \"play\"')", 10000)
    t0 = js(guest, 'S.t')
    time.sleep(0.6)
    check(js(guest, 'S.t') > t0, 'the guest comes back and the game moves on its page')

    # The host drops out: the guest waits for it.
    host.context.set_offline(True)
    wait(guest, "() => { const o = document.getElementById('coopScreen'); return !o.hidden && /Waiting for your/.test(o.textContent); }", 15000)
    check(True, 'the host drops out: the guest waits, counting down')
    host.context.set_offline(False)
    wait(guest, "() => document.getElementById('coopScreen').hidden", 20000)
    check(True, 'the host comes back and the guest plays on')

    phones.check_no_errors()
    check(True, 'no page errors')
