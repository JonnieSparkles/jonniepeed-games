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
    wait(host, "() => armyTest('S.turrets[1].firing && S.bullets.some(function (b) { return b.gun === 1; })')")
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

    # The supply table: the guest shops through the host; turret upgrades are each player's own, common ones shared.
    js(host, 'S.coins = 600; openShop(); S.shop.items = ["spread", "sandbags", "pizza"].map(function (id) { return ITEMS.find(function (q) { return q.id === id; }); }); S.shop.gift = null; renderShop(); "ok"')
    wait(guest, "() => !document.getElementById('shopScreen').hidden && document.querySelector('[data-item=\"spread\"]')")
    check(True, "the guest sees the supply table")
    guest.click('[data-item="spread"]')
    wait(host, "() => armyTest('!!S.turrets[1].mods.spread && !S.turrets[0].mods.spread')")
    check(True, "the guest's spread shot goes on the guest's barrel")
    guest.click('[data-item="sandbags"]')
    wait(host, "() => /comrade/.test(document.querySelector('[data-item=\"sandbags\"] em').textContent)")
    check(host.is_enabled('[data-item="spread"]'), 'the host sees the sandbags chosen by the comrade, and can still buy spread for its own barrel')
    wait(guest, "() => /Packed/.test(document.querySelector('[data-item=\"sandbags\"] em').textContent)")
    host.click('#continueBtn')
    wait(guest, "() => /Friend ✓/.test(document.getElementById('coopReady').textContent)")
    check(js(host, 'S.mode') == 'shop', 'the host is ready; the wave waits for the guest, who sees it')
    guest.click('#continueBtn')
    wait(host, "() => armyTest('S.mode') === 'play'")
    wait(guest, "() => document.getElementById('shopScreen').hidden")
    check(True, "the guest's Ready starts the wave")

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

    # The host drops out: the guest waits for it. (Each outage gives the host 8-10 s of play before its connection
    # notices it's gone, so the wall is made to last through them all.)
    js(host, 'S.mods.maxHP = S.wallHP = 1e6; "ok"')
    host.context.set_offline(True)
    wait(guest, "() => { const o = document.getElementById('coopScreen'); return !o.hidden && /Waiting for your/.test(o.textContent); }", 15000)
    check(True, 'the host drops out: the guest waits, counting down')
    # The host's own connection notices within about 10 s (rooms.js: no answer to its pings for 8 s).
    wait(host, "() => armyTest('S.mode') === 'paused'", 25000)
    wave, wall = js(host, 'S.wave'), js(host, 'S.wallHP')
    time.sleep(1)
    check(js(host, 'S.mode') == 'paused' and js(host, 'S.wallHP') == wall, "and the host's game pauses, so nothing happens while the guest can't see it")
    host.context.set_offline(False)
    wait(guest, "() => document.getElementById('coopScreen').hidden", 20000)
    wait(host, "() => armyTest('S.mode') === 'play'", 10000)
    check(True, 'the host comes back, its game plays on and the guest with it')

    # A wave that starts while the host is offline (both Ready in the shop) pauses at once.
    js(host, 'S.coins = 50; openShop(); "ok"')
    wait(guest, "() => !document.getElementById('shopScreen').hidden && !!document.getElementById('coopReady')")
    guest.click('#continueBtn')
    wait(host, "() => armyTest('!!(S.shop && S.shop.ready && S.shop.ready[1])')")
    host.context.set_offline(True)
    wait(host, "() => armyTest('COOP.room.status') !== 'connected'", 25000)
    host.click('#continueBtn')
    wait(host, "() => armyTest('S.mode') === 'paused'", 5000)
    check(True, 'a wave started while the host is offline pauses at once')
    host.context.set_offline(False)
    wait(host, "() => armyTest('S.mode') === 'play'", 20000)
    wait(guest, "() => document.getElementById('shopScreen').hidden && armyTest('COOP.guest && S.mode === \"play\"')", 15000)
    check(True, 'and plays once the host is back, the guest with it')

    # Offline, the host resumes by hand, then pauses again: back online, that pause is the host's and stays.
    host.context.set_offline(True)
    wait(host, "() => armyTest('S.mode') === 'paused'", 25000)
    host.click('#resumeBtn')
    wait(host, "() => armyTest('S.mode') === 'play'", 5000)
    time.sleep(0.3)
    check(js(host, 'S.mode') == 'play', 'offline, a host who resumes by hand plays on')
    host.keyboard.press('p')
    wait(host, "() => armyTest('S.mode') === 'paused'", 5000)
    host.context.set_offline(False)
    wait(host, "() => armyTest('COOP.room.status') === 'connected'", 20000)
    time.sleep(0.5)
    check(js(host, 'S.mode') == 'paused', "and a pause after that is the host's: reconnecting leaves it")
    host.click('#resumeBtn')
    wait(host, "() => armyTest('S.mode') === 'play'", 5000)

    # A host back after the guest has called the match over: the guest rejoins its game.
    js(guest, 'COOP.TIMING.AWAY_END = 1; "ok"')
    host.context.set_offline(True)
    wait(guest, "() => { const o = document.getElementById('coopScreen'); return !o.hidden && /match is/.test(o.textContent); }", 20000)
    host.context.set_offline(False)
    wait(guest, "() => document.getElementById('coopScreen').hidden && armyTest('COOP.guest && S.mode === \"play\"')", 25000)
    wait(host, "() => armyTest('S.mode') === 'play'", 10000)
    check(True, 'a host back after the match was called over: the guest rejoins its game')

    # The host reloads mid-match: its run is gone, so the guest goes back to waiting; Start brings both back in.
    host.reload()
    wait(host, "() => !document.getElementById('coopStart') ? false : !document.getElementById('coopStart').disabled", 20000)
    wait(guest, "() => { const o = document.getElementById('coopScreen'); return !o.hidden && /Waiting for your/.test(o.textContent) && !armyTest('COOP.guest'); }", 20000)
    check(True, 'a host reload mid-match sends the guest back to waiting, and the host gets the link card with the friend there')
    host.click('#coopStart')
    wait(guest, "() => document.getElementById('titleScreen').hidden && armyTest('COOP.guest && S.mode === \"play\" && S.wave === 1')", 15000)
    check(True, 'and Start plays a new run together')

    # The end: both players side by side on each card.
    js(host, 'S.wallHP = 0; "ok"')
    wait(host, "() => !document.getElementById('overScreen').hidden && document.getElementById('coopTable-over')", 10000)
    wait(guest, "() => { const o = document.getElementById('coopScreen'); return !o.hidden && o.querySelector('.coop-table'); }", 10000)
    check('You' in host.text_content('#coopTable-over') and 'Friend' in guest.text_content('#coopScreen .coop-table'), 'the end cards put the two players side by side')

    phones.check_no_errors()
    check(True, 'no page errors')
