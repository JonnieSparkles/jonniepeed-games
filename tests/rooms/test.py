"""Browser checks for site/assets/rooms.js, the page side of rooms, against a local rooms Worker.

Start both servers (see harness.py), then:

    CHROMIUM=/usr/bin/chromium python3 tests/rooms/test.py

Each phone loads a bare test page with rooms.js and logs every event to window.log.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from harness import Phones, SITE, wait  # noqa: E402

PAGE = SITE + '/__rooms_test__.html'
# Every event goes into window.log as [name, ...args]. Sockets are tracked so a test can cut one.
HTML = """<!doctype html><meta charset="utf-8"><title>rooms test</title>
<script>
window.log = []; window.sockets = [];
const Real = WebSocket;
window.WebSocket = function (url) { const s = new Real(url); sockets.push(s); return s; };
window.WebSocket.prototype = Real.prototype;
</script>
<script src="%s/assets/rooms.js"></script>
<script>
function watch(room) {
  if (!room) { log.push(['none']); return; }
  window.room = room;
  for (const name of ['ready', 'join', 'leave', 'host', 'status', 'refused', 'error', 'seat'])
    room.on(name, (...args) => log.push([name, ...args]));
  room.on('message', (m, from) => log.push(['message', m, from]));
}
</script>""" % SITE


def page_for(phones, init=None):
    p = phones.new(init_script=init)
    p.route(PAGE.split('#')[0] + '*', lambda route: route.fulfill(body=HTML, content_type='text/html'))
    return p


def has(page, js_condition, timeout=8000):
    """Waits for a log entry matching a JS condition on e (the entry)."""
    wait(page, f'window.log && window.log.some(e => {js_condition})', timeout)


def main():
    with Phones() as phones:
        # ---------- open and join ----------
        a = page_for(phones)
        a.goto(PAGE)
        a.evaluate("watch(Rooms.open({ game: 'rooms-test', max: 3, secret: 'meatball' }))")
        has(a, "e[0] === 'ready' && e[1].seat === 1 && e[1].host === 1 && e[1].max === 3")
        assert a.evaluate('room.isHost') and a.evaluate('room.players') == [1]
        link = a.evaluate('room.link')
        assert link.split('#')[1] == a.evaluate('room.code') and a.url == link, (link, a.url)
        print('PASS open: a link is made, the opener is seat 1 and host')

        b = page_for(phones)
        b.goto(link)
        b.evaluate("watch(Rooms.join({ game: 'rooms-test' }))")
        has(b, "e[0] === 'ready' && e[1].seat === 2 && e[1].host === 1")
        has(a, "e[0] === 'join' && e[1] === 2")
        assert b.evaluate('room.players') == [1, 2] and not b.evaluate('room.isHost')
        print('PASS join from the link: seat 2, knows the host, the host hears it')

        none = page_for(phones)
        none.goto(PAGE)
        none.evaluate("watch(Rooms.join({ game: 'rooms-test' }))")
        has(none, "e[0] === 'none'")
        assert none.evaluate("Rooms.join({ game: 'rooms-test', code: 'NOT A CODE!' }) === null")
        print('PASS join without a valid code returns nothing to join')

        # ---------- messages ----------
        a.evaluate("room.send({ t: 'hi', n: 1 })")
        has(b, "e[0] === 'message' && e[1].t === 'hi' && e[2] === 1")
        c = page_for(phones)
        c.goto(link)
        c.evaluate("watch(Rooms.join({ game: 'rooms-test' }))")
        has(c, "e[0] === 'ready' && e[1].seat === 3")
        a.evaluate("room.sendTo(3, { t: 'only-c' })")
        has(c, "e[0] === 'message' && e[1].t === 'only-c' && e[1].to === 3")
        a.wait_for_timeout(300)
        assert not b.evaluate("log.some(e => e[0] === 'message' && e[1].t === 'only-c')")
        print('PASS send reaches everyone else with who sent it; sendTo reaches one seat')

        a.evaluate("room.send({ t: 'big', s: 'x'.repeat(20000) })")
        has(a, "e[0] === 'error' && e[1].reason === 'too big'")
        print('PASS a message that is too big comes back as an error event (and a console warning)')

        # ---------- refused ----------
        d = page_for(phones)
        d.goto(link)
        d.evaluate("watch(Rooms.join({ game: 'rooms-test' }))")
        has(d, "e[0] === 'refused' && e[1] === 'full'")
        w = page_for(phones)
        w.goto(link)
        w.evaluate("watch(Rooms.join({ game: 'another-game' }))")
        has(w, "e[0] === 'refused' && e[1] === 'wrong-game'")
        n = page_for(phones)
        n.goto(PAGE + '#neveropenedroom1')
        n.evaluate("watch(Rooms.join({ game: 'rooms-test' }))")
        has(n, "e[0] === 'refused' && e[1] === 'closed'")
        s = page_for(phones)
        s.goto(PAGE)
        s.evaluate("watch(Rooms.open({ game: 'rooms-test', secret: 'pickle' }))")
        has(s, "e[0] === 'refused' && e[1] === 'nope'")
        print('PASS refused: full, wrong game, a link that isn\'t open, the wrong secret')

        # ---------- dropped connections ----------
        # B's connection drops: it reconnects by itself, keeps seat 2, and it's back inside the room's grace
        # period, so the others never see it leave.
        b.evaluate('sockets[sockets.length - 1].close(4000)')
        has(b, "e[0] === 'status' && e[1] === 'reconnecting'")
        wait(b, "room.status === 'connected' && room.seat === 2 && sockets.length === 2")
        a.wait_for_timeout(1200)
        assert not a.evaluate("log.some(e => e[0] === 'leave' && e[1] === 2)") and a.evaluate('room.players') == [1, 2, 3]
        print('PASS a dropped connection reconnects by itself, keeps its seat, and nobody sees it go')

        # B reloads: same tab, same player, same seat, and the others don't see it leave.
        b.reload()
        b.evaluate("watch(Rooms.join({ game: 'rooms-test' }))")
        has(b, "e[0] === 'ready' && e[1].seat === 2")
        a.wait_for_timeout(1200)
        assert not a.evaluate("log.some(e => e[0] === 'leave' && e[1] === 2)")
        print('PASS a reload comes back as the same player in the same seat, without leaving')

        # The same match opened again with B's identity (a duplicated tab): the older one is told it was replaced.
        me = b.evaluate(f"sessionStorage.getItem('rooms.me.' + room.code)")
        dup = page_for(phones, init=f"sessionStorage.setItem('rooms.me.{link.split('#')[1]}', '{me}')")
        dup.goto(link)
        dup.evaluate("watch(Rooms.join({ game: 'rooms-test' }))")
        has(dup, "e[0] === 'ready' && e[1].seat === 2")
        has(b, "e[0] === 'refused' && e[1] === 'replaced'")
        print('PASS the same player opening the match in a second tab replaces the first, which is told')

        # ---------- host changes ----------
        a.close()
        has(c, "e[0] === 'host' && e[1] === 2")
        wait(dup, 'room.isHost')
        print('PASS when the host leaves, the next seat becomes host and everyone hears it')

        # ---------- dead connections ----------
        # C's connection dies without closing (nothing gets through either way). After 8 s without a pong it
        # notices, reconnects to its seat, and it's back before anyone is told it left.
        n_before = c.evaluate('sockets.length')
        c.evaluate('const s = sockets[sockets.length - 1]; s.send = () => {}; s.onmessage = null')
        wait(c, f"sockets.length > {n_before} && room.status === 'connected' && room.seat === 3", timeout=20000)
        assert dup.evaluate('room.players') == [2, 3]
        print('PASS a connection that dies silently is noticed and replaced; the player keeps its seat')

        wait(dup, 'room.rtt > 0')
        print('PASS round trip measured:', dup.evaluate('room.rtt'), 'ms')
        phones.check_no_errors()
        print('PASS no page errors')


if __name__ == '__main__':
    main()
